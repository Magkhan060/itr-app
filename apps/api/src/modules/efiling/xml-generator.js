// Generates ITR-1 XML in a structure compatible with the ITD e-Filing schema.
// Fields not captured in our data model are defaulted to 0 / empty string.
// When real ITD credentials are configured, this XML is submitted as-is.

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (v) => Math.round(Number(v) || 0);

const AY_CODE_MAP = {
  "2026-27": "2627",
  "2025-26": "2526",
  "2024-25": "2425",
};

export const generateITR1XML = (filing) => {
  const d    = filing.itr1Data || {};
  const tax  = d.taxComputation || {};
  const ay   = filing.assessmentYear || "2026-27";
  const ayCode = AY_CODE_MAP[ay] || ay.replace("-", "").slice(0, 4);

  // Split fullName into first + surname for ITD schema
  const parts     = (d.fullName || "").trim().split(/\s+/);
  const surName   = parts.length > 1 ? parts.pop() : parts[0] || "";
  const firstName = parts.join(" ");

  // Regime flags
  const isNew     = d.selectedRegime === "new";
  const newFlag   = isNew ? "Y" : "N";

  // Income figures
  // Budget 2025: standard deduction under new regime is ₹75,000 (vs ₹50,000 old regime)
  // HRA exemption u/s 10(13A) is NOT available under new regime
  const grossSalary    = num(d.grossSalary);
  const stdDeduction   = isNew ? Math.min(75000, grossSalary) : Math.min(50000, grossSalary);
  const hraExempt      = isNew ? 0 : num(d.hra_exempt);
  const profTax        = num(d.professionalTax || 0);
  const deductionUs16  = stdDeduction + hraExempt + profTax;
  const netSalary      = Math.max(0, grossSalary - deductionUs16);
  const homeLoanInt    = isNew ? 0 : num(d.homeLoanInterest);  // 24(b) home loan not available under new regime
  const interestIncome = num(d.interestIncome);
  const otherIncome    = num(d.otherIncome);
  const grossTotal     = netSalary - homeLoanInt + interestIncome + otherIncome;

  // Deductions (Chapter VI-A) — all zero under new regime
  const sec80C      = isNew ? 0 : Math.min(num(d.sec80C), 150000);
  const sec80CCD1B  = isNew ? 0 : Math.min(num(d.sec80CCD1B), 50000);
  const sec80D      = isNew ? 0 : Math.min(num(d.sec80D_self) + num(d.sec80D_parents), 75000);
  const sec80TTA    = isNew ? 0 : Math.min(num(d.sec80TTA_TTB), 10000);
  const sec80G      = isNew ? 0 : num(d.sec80G);
  const lta         = isNew ? 0 : num(d.lta);
  const totalDeductions = sec80C + sec80CCD1B + sec80D + sec80TTA + sec80G + lta;

  const taxableIncome  = Math.max(0, grossTotal - totalDeductions);
  const totalTax       = num(tax.totalTax || 0);
  const rebate87A      = num(tax.rebateApplied || 0);
  const surcharge      = num(tax.surcharge || 0);
  const cess           = num(tax.cess || 0);
  const tdsDeducted    = num(d.tdsDeducted);
  const refundDue      = Math.max(0, tdsDeducted - totalTax);
  const balPayable     = Math.max(0, totalTax - tdsDeducted);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ITR xmlns:xsd="http://www.w3.org/2001/XMLSchema"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ITR1>
    <CreationInfo>
      <SWVersionNo>1.0</SWVersionNo>
      <SWCreatedBy>ITR-App v1.0</SWCreatedBy>
      <JSONDtd>1</JSONDtd>
      <AssessmentYear>${ayCode}</AssessmentYear>
      <IntermediaryCity>${esc(d.city)}</IntermediaryCity>
    </CreationInfo>
    <Form_ITR1>
      <PersonalInfo>
        <AssesseeName>
          <FirstName>${esc(firstName)}</FirstName>
          <MiddleName></MiddleName>
          <SurName>${esc(surName)}</SurName>
        </AssesseeName>
        <PAN>${esc(d.pan)}</PAN>
        <DOB>${d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}</DOB>
        <EmployerCategory>OTHERS</EmployerCategory>
        <AadhaarCardNo>${esc(d.aadhaar || "")}</AadhaarCardNo>
        <MobileNo>${esc(d.mobile || "")}</MobileNo>
        <EmailAddress></EmailAddress>
      </PersonalInfo>
      <Address>
        <ResidenceNo>${esc(d.addressLine1 || "")}</ResidenceNo>
        <LocalityOrArea></LocalityOrArea>
        <CityOrTownOrDistrict>${esc(d.city)}</CityOrTownOrDistrict>
        <CountryCode>91</CountryCode>
        <PinCode>${esc(d.pinCode || "")}</PinCode>
      </Address>
      <FilingStatus>
        <ReturnFileSec>11</ReturnFileSec>
        <SeventhProvisio139>N</SeventhProvisio139>
        <ConditionsResidential>${(d.residentialStatus || "ROR").toLowerCase()}</ConditionsResidential>
        <IsDefective>N</IsDefective>
        <NewTaxRegime>${newFlag}</NewTaxRegime>
        <OptionNewTaxRegime>${newFlag}</OptionNewTaxRegime>
      </FilingStatus>
      <ScheduleS>
        <NameOfEmployer>${esc(d.employerName)}</NameOfEmployer>
        <TANofEmployer>${esc(d.employerTAN)}</TANofEmployer>
        <GrossSalary>${grossSalary}</GrossSalary>
        <Salary>${grossSalary}</Salary>
        <PerquisitesValue>0</PerquisitesValue>
        <ProfitsInSalary>0</ProfitsInSalary>
        <DeductionUs16ia>${stdDeduction}</DeductionUs16ia>
        <DeductionUs16ii>${hraExempt}</DeductionUs16ii>
        <DeductionUs16iii>${profTax}</DeductionUs16iii>
        <TotalDeductionUs16>${deductionUs16}</TotalDeductionUs16>
        <IncomeFromSalary>${netSalary}</IncomeFromSalary>
      </ScheduleS>
      <ScheduleHP>
        <TotalIncomefromHP>${-homeLoanInt}</TotalIncomefromHP>
        <InterestPayable24b>${homeLoanInt}</InterestPayable24b>
      </ScheduleHP>
      <ScheduleOS>
        <IncomeFromOS>
          <OtherSrcThanOwnRaceHorse>${interestIncome + otherIncome}</OtherSrcThanOwnRaceHorse>
        </IncomeFromOS>
      </ScheduleOS>
      <ScheduleVIA>
        <DeductUndChapVIA>
          <Section80C>${sec80C}</Section80C>
          <Section80CCD1B>${sec80CCD1B}</Section80CCD1B>
          <Section80D>${sec80D}</Section80D>
          <Section80TTA_TTB>${sec80TTA}</Section80TTA_TTB>
          <Section80G>${sec80G}</Section80G>
          <TotalChapVIADeductions>${totalDeductions}</TotalChapVIADeductions>
        </DeductUndChapVIA>
      </ScheduleVIA>
      <ITR1_IncomeDeductions>
        <GrossSalary>${grossSalary}</GrossSalary>
        <DeductionUs16>${deductionUs16}</DeductionUs16>
        <NetSalary>${netSalary}</NetSalary>
        <TotalIncomeOfHP>${-homeLoanInt}</TotalIncomeOfHP>
        <IncomeOtherSources>${interestIncome + otherIncome}</IncomeOtherSources>
        <GrossTotalIncome>${grossTotal}</GrossTotalIncome>
        <TotalIncome>${taxableIncome}</TotalIncome>
      </ITR1_IncomeDeductions>
      <ITR1_TaxComputation>
        <TaxPayableOnTI>${num(tax.taxBeforeRebate || totalTax + rebate87A)}</TaxPayableOnTI>
        <Rebate87A>${rebate87A}</Rebate87A>
        <TaxPayableAfterRebate>${Math.max(0, totalTax - cess - surcharge)}</TaxPayableAfterRebate>
        <Surcharge>${surcharge}</Surcharge>
        <EducationCess>${cess}</EducationCess>
        <TaxPayable>${totalTax}</TaxPayable>
        <TaxRelief89>0</TaxRelief89>
        <NetTaxPayable>${totalTax}</NetTaxPayable>
      </ITR1_TaxComputation>
      <TaxPaid>
        <TaxesPaid>
          <AdvanceTax>0</AdvanceTax>
          <TDS1>${tdsDeducted}</TDS1>
          <TDS2>0</TDS2>
          <TCS>0</TCS>
          <SelfAssessmentTax>0</SelfAssessmentTax>
          <TotalTaxesPaid>${tdsDeducted}</TotalTaxesPaid>
        </TaxesPaid>
        <BalTaxPayable>${balPayable}</BalTaxPayable>
      </TaxPaid>
      <Refund>
        <RefundDue>${refundDue}</RefundDue>
        <BankAccountNo>${esc(d.bankAccountNo || "")}</BankAccountNo>
        <BankIFSC>${esc(d.ifscCode || "")}</BankIFSC>
      </Refund>
      <Verification>
        <Declaration>
          <AssesseeVerName>${esc(d.fullName)}</AssesseeVerName>
          <AssesseeVerPAN>${esc(d.pan)}</AssesseeVerPAN>
          <FatherName>${esc(d.fatherName || "")}</FatherName>
          <Designation>SELF</Designation>
        </Declaration>
        <Capacity>S</Capacity>
        <Place>${esc(d.city)}</Place>
      </Verification>
    </Form_ITR1>
  </ITR1>
</ITR>`;
};

// Generates ITR-2 XML — same PersonalInfo/Address/FilingStatus/ScheduleS/
// ScheduleVIA/TaxPaid/Refund/Verification shape as ITR-1, but ScheduleHP
// covers multiple properties (not just one self-occupied) and adds a new
// ScheduleCG section for equity capital gains (Sec 111A / 112A — see
// engine.service.js's compareRegimesWithCapitalGains for the tax math this
// XML reports, computed server-side and trusted as-is here).
export const generateITR2XML = (filing) => {
  const d    = filing.itr2Data || {};
  const tax  = d.taxComputation || {};
  const cg   = tax.capitalGains || {};
  const ay   = filing.assessmentYear || "2026-27";
  const ayCode = AY_CODE_MAP[ay] || ay.replace("-", "").slice(0, 4);

  const parts     = (d.fullName || "").trim().split(/\s+/);
  const surName   = parts.length > 1 ? parts.pop() : parts[0] || "";
  const firstName = parts.join(" ");

  const isNew   = d.selectedRegime === "new";
  const newFlag = isNew ? "Y" : "N";

  const grossSalary    = num(d.grossSalary);
  const stdDeduction   = isNew ? Math.min(75000, grossSalary) : Math.min(50000, grossSalary);
  const hraExempt      = isNew ? 0 : num(d.hra_exempt);
  const profTax        = num(d.professionalTax || 0);
  const deductionUs16  = stdDeduction + hraExempt + profTax;
  const netSalary      = Math.max(0, grossSalary - deductionUs16);
  const housePropertyNetIncome = num(d.housePropertyNetIncome || 0);
  const interestIncome = num(d.interestIncome);
  const otherIncome    = num(d.otherIncome);
  const grossTotal     = netSalary + housePropertyNetIncome + interestIncome + otherIncome;

  const sec80C      = isNew ? 0 : Math.min(num(d.sec80C), 150000);
  const sec80CCD1B  = isNew ? 0 : Math.min(num(d.sec80CCD1B), 50000);
  const sec80D      = isNew ? 0 : Math.min(num(d.sec80D_self) + num(d.sec80D_parents), 75000);
  const sec80TTA    = isNew ? 0 : Math.min(num(d.sec80TTA_TTB), 10000);
  const sec80G      = isNew ? 0 : (num(d.sec80G_cash) + num(d.sec80G_cheque));
  const lta         = isNew ? 0 : num(d.lta);
  const totalDeductions = sec80C + sec80CCD1B + sec80D + sec80TTA + sec80G + lta;

  const slabTaxableIncome = num(tax.slabTaxableIncome ?? Math.max(0, grossTotal - totalDeductions));
  const stcg111A    = num(cg.stcg111A || 0);
  const ltcg112A    = num(cg.ltcg112A || 0);
  const taxableLTCG = num(cg.taxableLTCG || 0);
  const ltcgDeduction112A = Math.max(0, ltcg112A - taxableLTCG);
  const cgTaxSTCG   = num(cg.stcgTax || 0);
  const cgTaxLTCG   = num(cg.ltcgTax || 0);
  const totalCGTax  = num(cg.totalCGTax || cgTaxSTCG + cgTaxLTCG);

  const totalTax    = num(tax.totalTax || 0);
  const rebate87A   = num(tax.rebateApplied || 0);
  const surcharge   = num(tax.surcharge || 0);
  const cess        = num(tax.cess || 0);
  const slabTaxBeforeRebate = num(tax.taxBeforeRebate || 0);
  const tdsDeducted = num(d.tdsDeducted);
  const refundDue   = Math.max(0, tdsDeducted - totalTax);
  const balPayable  = Math.max(0, totalTax - tdsDeducted);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ITR xmlns:xsd="http://www.w3.org/2001/XMLSchema"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ITR2>
    <CreationInfo>
      <SWVersionNo>1.0</SWVersionNo>
      <SWCreatedBy>ITR-App v1.0</SWCreatedBy>
      <JSONDtd>1</JSONDtd>
      <AssessmentYear>${ayCode}</AssessmentYear>
      <IntermediaryCity>${esc(d.city)}</IntermediaryCity>
    </CreationInfo>
    <Form_ITR2>
      <PersonalInfo>
        <AssesseeName>
          <FirstName>${esc(firstName)}</FirstName>
          <MiddleName></MiddleName>
          <SurName>${esc(surName)}</SurName>
        </AssesseeName>
        <PAN>${esc(d.pan)}</PAN>
        <DOB>${d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}</DOB>
        <EmployerCategory>OTHERS</EmployerCategory>
        <AadhaarCardNo>${esc(d.aadhaar || "")}</AadhaarCardNo>
        <MobileNo>${esc(d.mobile || "")}</MobileNo>
        <EmailAddress></EmailAddress>
      </PersonalInfo>
      <Address>
        <ResidenceNo>${esc(d.addressLine1 || "")}</ResidenceNo>
        <LocalityOrArea></LocalityOrArea>
        <CityOrTownOrDistrict>${esc(d.city)}</CityOrTownOrDistrict>
        <CountryCode>91</CountryCode>
        <PinCode>${esc(d.pinCode || "")}</PinCode>
      </Address>
      <FilingStatus>
        <ReturnFileSec>11</ReturnFileSec>
        <SeventhProvisio139>N</SeventhProvisio139>
        <ConditionsResidential>${(d.residentialStatus || "ROR").toLowerCase()}</ConditionsResidential>
        <IsDefective>N</IsDefective>
        <NewTaxRegime>${newFlag}</NewTaxRegime>
        <OptionNewTaxRegime>${newFlag}</OptionNewTaxRegime>
      </FilingStatus>
      <ScheduleS>
        <NameOfEmployer>${esc(d.employerName)}</NameOfEmployer>
        <TANofEmployer>${esc(d.employerTAN)}</TANofEmployer>
        <GrossSalary>${grossSalary}</GrossSalary>
        <Salary>${grossSalary}</Salary>
        <PerquisitesValue>0</PerquisitesValue>
        <ProfitsInSalary>0</ProfitsInSalary>
        <DeductionUs16ia>${stdDeduction}</DeductionUs16ia>
        <DeductionUs16ii>${hraExempt}</DeductionUs16ii>
        <DeductionUs16iii>${profTax}</DeductionUs16iii>
        <TotalDeductionUs16>${deductionUs16}</TotalDeductionUs16>
        <IncomeFromSalary>${netSalary}</IncomeFromSalary>
      </ScheduleS>
      <ScheduleHP>
        <NumberOfProperties>${(d.houseProperties || []).length}</NumberOfProperties>
        <TotalIncomefromHP>${housePropertyNetIncome}</TotalIncomefromHP>
        ${(d.houseProperties || []).map((p, i) => `
        <Property>
          <PropertyNo>${i + 1}</PropertyNo>
          <PropertyType>${esc(p.type === "let_out" ? "L" : "S")}</PropertyType>
          <AnnualRent>${num(p.annualRent)}</AnnualRent>
          <MunicipalTax>${num(p.municipalTax)}</MunicipalTax>
          <InterestOnLoan>${num(p.interestOnLoan)}</InterestOnLoan>
        </Property>`).join("")}
      </ScheduleHP>
      <ScheduleCG>
        <ShortTermCapGainFor111A>${stcg111A}</ShortTermCapGainFor111A>
        <ShortTermCapGainTax111A>${cgTaxSTCG}</ShortTermCapGainTax111A>
        <LongTermCapGain112A>${ltcg112A}</LongTermCapGain112A>
        <LTCGDeduction112A>${ltcgDeduction112A}</LTCGDeduction112A>
        <LongTermCapGain112ATaxable>${taxableLTCG}</LongTermCapGain112ATaxable>
        <LongTermCapGainTax112A>${cgTaxLTCG}</LongTermCapGainTax112A>
        <TotalCapitalGainsTax>${totalCGTax}</TotalCapitalGainsTax>
      </ScheduleCG>
      <ScheduleOS>
        <IncomeFromOS>
          <OtherSrcThanOwnRaceHorse>${interestIncome + otherIncome}</OtherSrcThanOwnRaceHorse>
        </IncomeFromOS>
      </ScheduleOS>
      <ScheduleVIA>
        <DeductUndChapVIA>
          <Section80C>${sec80C}</Section80C>
          <Section80CCD1B>${sec80CCD1B}</Section80CCD1B>
          <Section80D>${sec80D}</Section80D>
          <Section80TTA_TTB>${sec80TTA}</Section80TTA_TTB>
          <Section80G>${sec80G}</Section80G>
          <TotalChapVIADeductions>${totalDeductions}</TotalChapVIADeductions>
        </DeductUndChapVIA>
      </ScheduleVIA>
      <ITR2_IncomeDeductions>
        <GrossSalary>${grossSalary}</GrossSalary>
        <DeductionUs16>${deductionUs16}</DeductionUs16>
        <NetSalary>${netSalary}</NetSalary>
        <TotalIncomeOfHP>${housePropertyNetIncome}</TotalIncomeOfHP>
        <IncomeOtherSources>${interestIncome + otherIncome}</IncomeOtherSources>
        <ShortTermCapitalGains>${stcg111A}</ShortTermCapitalGains>
        <LongTermCapitalGains>${taxableLTCG}</LongTermCapitalGains>
        <GrossTotalIncome>${grossTotal}</GrossTotalIncome>
        <TotalIncome>${slabTaxableIncome}</TotalIncome>
      </ITR2_IncomeDeductions>
      <ITR2_TaxComputation>
        <TaxPayableOnTI>${slabTaxBeforeRebate}</TaxPayableOnTI>
        <Rebate87A>${rebate87A}</Rebate87A>
        <CapitalGainsTax>${totalCGTax}</CapitalGainsTax>
        <Surcharge>${surcharge}</Surcharge>
        <EducationCess>${cess}</EducationCess>
        <TaxPayable>${totalTax}</TaxPayable>
        <TaxRelief89>0</TaxRelief89>
        <NetTaxPayable>${totalTax}</NetTaxPayable>
      </ITR2_TaxComputation>
      <TaxPaid>
        <TaxesPaid>
          <AdvanceTax>0</AdvanceTax>
          <TDS1>${tdsDeducted}</TDS1>
          <TDS2>0</TDS2>
          <TCS>0</TCS>
          <SelfAssessmentTax>0</SelfAssessmentTax>
          <TotalTaxesPaid>${tdsDeducted}</TotalTaxesPaid>
        </TaxesPaid>
        <BalTaxPayable>${balPayable}</BalTaxPayable>
      </TaxPaid>
      <Refund>
        <RefundDue>${refundDue}</RefundDue>
        <BankAccountNo>${esc(d.bankAccountNo || "")}</BankAccountNo>
        <BankIFSC>${esc(d.ifscCode || "")}</BankIFSC>
      </Refund>
      <Verification>
        <Declaration>
          <AssesseeVerName>${esc(d.fullName)}</AssesseeVerName>
          <AssesseeVerPAN>${esc(d.pan)}</AssesseeVerPAN>
          <FatherName>${esc(d.fatherName || "")}</FatherName>
          <Designation>SELF</Designation>
        </Declaration>
        <Capacity>S</Capacity>
        <Place>${esc(d.city)}</Place>
      </Verification>
    </Form_ITR2>
  </ITR2>
</ITR>`;
};
