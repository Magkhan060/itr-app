import * as approvalService from "./approval.service.js";
import * as response        from "../../utils/response.util.js";

// CA-authenticated: send approval request
export const sendApproval = async (req, res, next) => {
  try {
    const { filingId } = req.body;
    if (!filingId) return response.error(res, "filingId is required", 400, "MISSING_FIELDS");
    const data = await approvalService.sendApprovalRequest(req.userId, filingId);
    return response.success(res, data, "Approval request sent to client");
  } catch (err) { next(err); }
};

// Public (no auth): get filing summary by token
export const getApprovalSummary = async (req, res, next) => {
  try {
    const data = await approvalService.getApprovalSummary(req.params.token);
    return response.success(res, data, "Approval summary fetched");
  } catch (err) { next(err); }
};

// Public (no auth): client approves or rejects
export const respondToApproval = async (req, res, next) => {
  try {
    const { action, comment } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return response.error(res, "action must be 'approve' or 'reject'", 400, "INVALID_ACTION");
    }
    const data = await approvalService.respondToApproval(req.params.token, { action, comment });
    return response.success(res, data, `Filing ${action === "approve" ? "approved" : "rejected"} successfully`);
  } catch (err) { next(err); }
};
