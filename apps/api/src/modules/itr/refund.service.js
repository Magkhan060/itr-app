import Filing from "./filing.model.js";

// Simulates refund status — real implementation hooks into ITD API
// when EFILING_DIRECT flag is enabled
const REFUND_STAGES = [
  { code: "SUBMITTED",         label: "Return Filed",          days: 0   },
  { code: "VERIFIED",          label: "Return Verified",       days: 3   },
  { code: "PROCESSING",        label: "Under Processing",      days: 15  },
  { code: "REFUND_DETERMINED", label: "Refund Determined",     days: 30  },
  { code: "REFUND_INITIATED",  label: "Refund Initiated",      days: 45  },
  { code: "REFUND_PAID",       label: "Refund Credited",       days: 60  },
];

export const getRefundStatus = async (userId, filingId) => {
  const filing = await Filing.findOne({ _id: filingId, userId });
  if (!filing) throw Object.assign(new Error("Filing not found"), { status: 404 });

  if (filing.status === "draft") {
    return { applicable: false, message: "ITR not yet submitted" };
  }

  const taxData    = filing.itr1Data?.taxComputation;
  const tdsData    = filing.itr1Data?.tdsDeducted || 0;
  const totalTax   = taxData?.totalTax || 0;
  const refundAmt  = Math.max(0, tdsData - totalTax);

  if (refundAmt === 0) {
    return {
      applicable:        false,
      message:           "No refund applicable for this filing",
      acknowledgementNo: filing.acknowledgementNo,
      totalTax,
      tdsDeducted:       tdsData,
    };
  }

  // Simulate processing stage based on days since submission
  const submittedAt  = new Date(filing.submittedAt || filing.createdAt);
  const today        = new Date();
  const daysSince    = Math.floor((today - submittedAt) / (1000 * 60 * 60 * 24));

  const currentStage = REFUND_STAGES.reduce((acc, stage) => {
    return daysSince >= stage.days ? stage : acc;
  }, REFUND_STAGES[0]);

  const currentIdx   = REFUND_STAGES.findIndex((s) => s.code === currentStage.code);
  const nextStage    = REFUND_STAGES[currentIdx + 1] || null;
  const progress     = Math.round(((currentIdx + 1) / REFUND_STAGES.length) * 100);

  return {
    applicable:        true,
    refundAmount:      refundAmt,
    acknowledgementNo: filing.acknowledgementNo,
    submittedAt:       filing.submittedAt,
    currentStage,
    nextStage,
    progress,
    stages:            REFUND_STAGES,
    daysSinceSubmission: daysSince,
    estimatedCreditDate: nextStage
      ? new Date(submittedAt.getTime() + nextStage.days * 86400000).toISOString()
      : null,
  };
};
