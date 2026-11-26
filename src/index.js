var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/errors.ts
function error(code, path, message, expected, received) {
  const result = { code, path, message };
  if (expected !== void 0) result.expected = expected;
  if (received !== void 0) result.received = received;
  return result;
}
__name(error, "error");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
__name(nonEmpty, "nonEmpty");
function stringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
__name(stringArray, "stringArray");

// src/plans/common.ts
var REQUIRED_OPTION_ACTIONS = ["approve", "revise", "regenerate"];
function normalizeContinuationOptions(options, approveLabel) {
  return options.map((option) => option.action === "approve" ? { ...option, label: approveLabel.trim() } : { ...option });
}
__name(normalizeContinuationOptions, "normalizeContinuationOptions");
function validateApprovalContinuationLabel(options, expectedLabel, path = "options") {
  const approveIndex = options.findIndex((option) => option.action === "approve");
  if (approveIndex < 0) return [];
  const actual = options[approveIndex].label.trim();
  const expected = expectedLabel.trim();
  return actual === expected ? [] : [error(
    "approval_continuation_label_mismatch",
    `${path}[${approveIndex}].label`,
    "Approve option must name approval and the exact next workflow step.",
    expected,
    actual
  )];
}
__name(validateApprovalContinuationLabel, "validateApprovalContinuationLabel");
function normalizeIdArray(value) {
  if (!stringArray(value)) return void 0;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}
__name(normalizeIdArray, "normalizeIdArray");
function sameStringSet(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}
__name(sameStringSet, "sameStringSet");
function getInstallmentDisplayLabel(installment) {
  const suppliedTitle = installment.title?.trim();
  return suppliedTitle || `Installment ${installment.number}`;
}
__name(getInstallmentDisplayLabel, "getInstallmentDisplayLabel");
function getInstallmentPovIds(installment) {
  return installment.compiler_metadata?.pov_character_ids ?? installment.pov_character_ids ?? [];
}
__name(getInstallmentPovIds, "getInstallmentPovIds");
function parseMapReceipts(input, path) {
  const errors = [];
  const construction = input?.construction_receipt;
  const constructionPath = `${path}.construction_receipt`;
  if (!isRecord(construction)) {
    errors.push(error("missing_construction_receipt", constructionPath, "A hidden four-question construction_receipt is required for every map installment."));
  }
  const expectedQuestions = [
    "What happens?",
    "What gets in the way?",
    "What's the consequence?",
    "What is left unresolved?"
  ];
  const answers = construction?.answers;
  if (isRecord(construction)) {
    if (!nonEmpty(construction.candidate_id)) errors.push(error("missing_candidate_id", `${constructionPath}.candidate_id`, "construction_receipt.candidate_id must bind the receipt to this candidate."));
    if (construction.version !== 1) errors.push(error("unsupported_construction_receipt_version", `${constructionPath}.version`, "construction_receipt.version must be 1.", 1, construction.version));
    if (construction.constructed_before_planner_fields !== true) errors.push(error("construction_receipt_order_unverified", `${constructionPath}.constructed_before_planner_fields`, "The four-question evidence must attest that construction preceded planner fields.", true, construction.constructed_before_planner_fields));
    if (!Array.isArray(construction.question_order) || construction.question_order.length !== expectedQuestions.length || construction.question_order.some((q, i) => q !== expectedQuestions[i])) {
      errors.push(error("invalid_construction_question_order", `${constructionPath}.question_order`, "The four canonical questions must appear in their required order.", expectedQuestions, construction.question_order));
    }
    if (!isRecord(answers)) {
      errors.push(error("missing_construction_answers", `${constructionPath}.answers`, "construction_receipt.answers must contain all four concrete answers."));
    } else {
      const answerKeys = ["what_happens", "what_gets_in_the_way", "whats_the_consequence", "what_is_left_unresolved"];
      answerKeys.forEach(key => {
        if (!nonEmpty(answers[key])) errors.push(error("missing_construction_answer", `${constructionPath}.answers.${key}`, `${key} must be a concrete, non-empty story answer.`));
      });
      if (answerKeys.every(key => nonEmpty(answers[key]))) {
        const normalizedAnswers = answerKeys.map(key => answers[key].trim().toLowerCase());
        if (new Set(normalizedAnswers).size !== answerKeys.length) errors.push(error("duplicate_construction_answers", `${constructionPath}.answers`, "The four construction answers must be materially distinct."));
      }
    }
    if (!nonEmpty(construction.this_is_the_story_where)) errors.push(error("missing_story_unit_premise", `${constructionPath}.this_is_the_story_where`, "A concise This is the story where... premise is required."));
  }
  const capacity = input?.route_capacity_receipt;
  const capacityPath = `${path}.route_capacity_receipt`;
  if (!isRecord(capacity)) {
    errors.push(error("missing_route_capacity_receipt", capacityPath, "A hidden route_capacity_receipt is required for every map installment."));
  }
  if (isRecord(capacity)) {
    if (!nonEmpty(capacity.candidate_id)) errors.push(error("missing_candidate_id", `${capacityPath}.candidate_id`, "route_capacity_receipt.candidate_id must bind the evidence to this candidate."));
    if (capacity.version !== 1) errors.push(error("unsupported_route_capacity_receipt_version", `${capacityPath}.version`, "route_capacity_receipt.version must be 1.", 1, capacity.version));
    if (!nonEmpty(capacity.target_installment_route)) errors.push(error("missing_capacity_route", `${capacityPath}.target_installment_route`, "The receipt must name the approved target installment route."));
    for (const key of ["route_scale_basis", "choice_altering_consequence"]) {
      if (!nonEmpty(capacity[key])) errors.push(error("missing_route_capacity_evidence", `${capacityPath}.${key}`, `${key} must explain the route-scale narrative capacity.`));
    }
    for (const key of ["substantive_turns", "interacting_threads", "opening_directions"]) {
      if (!stringArray(capacity[key]) || capacity[key].length < 2 || capacity[key].some(item => !item.trim())) {
        errors.push(error("insufficient_route_capacity_evidence", `${capacityPath}.${key}`, `${key} must contain at least two distinct concrete evidence items.`, "at least 2 non-empty strings", capacity[key]));
      } else if (new Set(capacity[key].map(item => item.trim().toLowerCase())).size < 2) {
        errors.push(error("duplicate_route_capacity_evidence", `${capacityPath}.${key}`, `${key} must contain distinct evidence items.`));
      }
    }
  }
  if (isRecord(construction) && isRecord(capacity) && nonEmpty(construction.candidate_id) && construction.candidate_id !== capacity.candidate_id) {
    errors.push(error("map_receipt_candidate_mismatch", capacityPath + ".candidate_id", "Construction and route-capacity receipts must bind to the same candidate.", construction.candidate_id, capacity.candidate_id));
  }
  if (errors.length) return { errors };
  return {
    value: {
      construction_receipt: {
        version: 1,
        candidate_id: construction.candidate_id.trim(),
        constructed_before_planner_fields: true,
        question_order: [...expectedQuestions],
        answers: {
          what_happens: construction.answers.what_happens.trim(),
          what_gets_in_the_way: construction.answers.what_gets_in_the_way.trim(),
          whats_the_consequence: construction.answers.whats_the_consequence.trim(),
          what_is_left_unresolved: construction.answers.what_is_left_unresolved.trim()
        },
        this_is_the_story_where: construction.this_is_the_story_where.trim()
      },
      route_capacity_receipt: {
        version: 1,
        candidate_id: capacity.candidate_id.trim(),
        target_installment_route: capacity.target_installment_route.trim(),
        route_scale_basis: capacity.route_scale_basis.trim(),
        substantive_turns: capacity.substantive_turns.map(item => item.trim()),
        interacting_threads: capacity.interacting_threads.map(item => item.trim()),
        opening_directions: capacity.opening_directions.map(item => item.trim()),
        choice_altering_consequence: capacity.choice_altering_consequence.trim()
      }
    },
    errors
  };
}
__name(parseMapReceipts, "parseMapReceipts");
function validateMapReceipts(installments, path, expectedRoute) {
  const errors = [];
  const candidateIds = new Set();
  installments.forEach((installment, index) => {
    const itemPath = `${path}[${index}]`;
    const construction = installment.construction_receipt;
    const capacity = installment.route_capacity_receipt;
    const candidateId = construction?.candidate_id;
    if (candidateId && candidateIds.has(candidateId)) {
      errors.push(error("duplicate_construction_candidate_id", `${itemPath}.construction_receipt.candidate_id`, "Each installment must have its own independently constructed candidate receipt.", void 0, candidateId));
    }
    if (candidateId) candidateIds.add(candidateId);
    if (expectedRoute && capacity?.target_installment_route?.trim().toLowerCase() !== expectedRoute.trim().toLowerCase()) {
      errors.push(error("route_capacity_route_mismatch", `${itemPath}.route_capacity_receipt.target_installment_route`, "Route-capacity evidence must match the Map's locked target route.", expectedRoute, capacity?.target_installment_route));
    }
  });
  return errors;
}
__name(validateMapReceipts, "validateMapReceipts");
function buildMapEvidenceReceipt(installments) {
  const ordered = [...installments].sort((a, b) => a.number - b.number);
  return {
    schema_version: 1,
    status: "complete",
    installment_count: ordered.length,
    construction_receipt_count: ordered.filter(item => isRecord(item.construction_receipt)).length,
    route_capacity_receipt_count: ordered.filter(item => isRecord(item.route_capacity_receipt)).length,
    covered_installment_numbers: ordered.map(item => item.number)
  };
}
__name(buildMapEvidenceReceipt, "buildMapEvidenceReceipt");
function parseInstallment(input, path) {
  const errors = [];
  if (!isRecord(input)) {
    return { errors: [error("invalid_type", path, "Installment must be an object.")] };
  }
  const requiredStrings = [
    "movement",
    "reason",
    "dramatic_focus",
    "state_change",
    "continuation_hook",
    "entry_pressure",
    "exit_pressure",
    "pressure_delta",
    "boundary_reason"
  ];
  for (const key of requiredStrings) {
    if (!nonEmpty(input[key])) {
      errors.push(error("missing_required_field", `${path}.${key}`, `${key} is required.`));
    }
  }
  // Mini-book structure is mandatory for every newly compiled map installment.
  if (nonEmpty(input.movement)) {
    const movement = input.movement.trim();
    const labels = [...movement.matchAll(/(?:^|\n)\s*(?:\*\*)?(Opening|Act I|Act II|Act III)(?:\*\*)?\s*:\s*(?:\*\*)?/gi)];
    const expected = ["opening", "act i", "act ii", "act iii"];
    if (labels.length !== 4 || labels.some((label, i) => label[1].toLowerCase() !== expected[i]) || movement.slice(0, labels[0]?.index ?? 0).trim()) {
      errors.push(error("missing_minibook_structure", `${path}.movement`, "Provide Opening:, Act I:, Act II:, Act III: in order on separate lines; keep the continuation hook in continuation_hook."));
    } else {
      const sections = labels.map((label, i) => movement.slice(label.index + label[0].length, labels[i+1]?.index ?? movement.length).trim());
      if (sections.some(section => !section) || new Set(sections.map(section => section.toLowerCase())).size !== 4) {
        errors.push(error("invalid_minibook_movements", `${path}.movement`, "All four mini-book movements must be nonempty and distinct."));
      }
    }
  }
  if (!Number.isInteger(input.number) || Number(input.number) < 1) {
    errors.push(error("invalid_installment_number", `${path}.number`, "Installment number must be a positive integer."));
  }
  const allowedHookTypes = /* @__PURE__ */ new Set([
    "danger",
    "discovery",
    "revelation",
    "decision",
    "reversal",
    "arrival",
    "emotional_rupture",
    "promise",
    "unanswered_question",
    "consequence_begins",
    "season_handoff"
  ]);
  if (!allowedHookTypes.has(String(input.continuation_hook_type))) {
    errors.push(error(
      "invalid_continuation_hook_type",
      `${path}.continuation_hook_type`,
      "continuation_hook_type is missing or unsupported."
    ));
  }
  for (const key of ["unresolved_pressures", "payoffs_owned", "reserved_material"]) {
    if (!stringArray(input[key])) {
      errors.push(error("invalid_string_array", `${path}.${key}`, `${key} must be an array of strings.`));
    }
  }
  const mapReceipts = parseMapReceipts(input, path);
  errors.push(...mapReceipts.errors);
  if (input.next_sibling_start_state !== void 0 && !nonEmpty(input.next_sibling_start_state)) {
    errors.push(error("invalid_next_sibling_start_state", `${path}.next_sibling_start_state`, "next_sibling_start_state must be a non-empty string when present."));
  }
  if (input.serial_engines_advanced !== void 0 && !stringArray(input.serial_engines_advanced)) {
    errors.push(error("invalid_string_array", `${path}.serial_engines_advanced`, "serial_engines_advanced must be an array of strings."));
  }
  let metadataPovIds;
  if (input.compiler_metadata !== void 0) {
    if (!isRecord(input.compiler_metadata)) {
      errors.push(error("invalid_type", `${path}.compiler_metadata`, "compiler_metadata must be an object."));
    } else if (input.compiler_metadata.pov_character_ids !== void 0) {
      if (!stringArray(input.compiler_metadata.pov_character_ids)) {
        errors.push(error(
          "invalid_string_array",
          `${path}.compiler_metadata.pov_character_ids`,
          "compiler_metadata.pov_character_ids must be an array of strings."
        ));
      } else {
        metadataPovIds = normalizeIdArray(input.compiler_metadata.pov_character_ids);
      }
    }
  }
  let legacyPovIds;
  if (input.pov_character_ids !== void 0) {
    if (!stringArray(input.pov_character_ids)) {
      errors.push(error("invalid_string_array", `${path}.pov_character_ids`, "pov_character_ids must be an array of strings."));
    } else {
      legacyPovIds = normalizeIdArray(input.pov_character_ids);
    }
  }
  if (metadataPovIds && legacyPovIds && !sameStringSet(metadataPovIds, legacyPovIds)) {
    errors.push(error(
      "pov_assignment_mismatch",
      `${path}.compiler_metadata.pov_character_ids`,
      "compiler_metadata.pov_character_ids and legacy pov_character_ids must contain the same identifiers.",
      metadataPovIds,
      legacyPovIds
    ));
  }
  if (errors.length > 0) return { errors };
  const value = {
    number: Number(input.number),
    movement: String(input.movement).trim(),
    reason: String(input.reason).trim(),
    dramatic_focus: String(input.dramatic_focus).trim(),
    state_change: String(input.state_change).trim(),
    continuation_hook: String(input.continuation_hook).trim(),
    continuation_hook_type: String(input.continuation_hook_type),
    entry_pressure: String(input.entry_pressure).trim(),
    exit_pressure: String(input.exit_pressure).trim(),
    pressure_delta: String(input.pressure_delta).trim(),
    unresolved_pressures: [...input.unresolved_pressures],
    boundary_reason: String(input.boundary_reason).trim(),
    payoffs_owned: [...input.payoffs_owned],
    reserved_material: [...input.reserved_material],
    construction_receipt: mapReceipts.value?.construction_receipt,
    route_capacity_receipt: mapReceipts.value?.route_capacity_receipt
  };
  if (nonEmpty(input.title)) {
    value.title = String(input.title).trim();
  }
  if (input.next_sibling_start_state !== void 0) {
    value.next_sibling_start_state = String(input.next_sibling_start_state).trim();
  }
  if (input.serial_engines_advanced !== void 0) {
    value.serial_engines_advanced = [...input.serial_engines_advanced];
  }
  const canonicalPovIds = metadataPovIds ?? legacyPovIds;
  if (input.compiler_metadata !== void 0 && isRecord(input.compiler_metadata)) {
    value.compiler_metadata = { ...input.compiler_metadata };
    if (canonicalPovIds !== void 0) {
      value.compiler_metadata.pov_character_ids = [...canonicalPovIds];
    }
  } else if (canonicalPovIds !== void 0) {
    value.compiler_metadata = { pov_character_ids: [...canonicalPovIds] };
  }
  if (legacyPovIds !== void 0) {
    value.pov_character_ids = [...canonicalPovIds];
  }
  return { value, errors };
}
__name(parseInstallment, "parseInstallment");
function parseAct(input, path) {
  const errors = [];
  if (!isRecord(input)) {
    return { errors: [error("invalid_type", path, "Act must be an object.")] };
  }
  if (!Number.isInteger(input.number) || Number(input.number) < 1) {
    errors.push(error("invalid_act_number", `${path}.number`, "Act number must be a positive integer."));
  }
  if (!Number.isInteger(input.start_installment) || Number(input.start_installment) < 1) {
    errors.push(error("invalid_act_range", `${path}.start_installment`, "start_installment must be a positive integer."));
  }
  if (!Number.isInteger(input.end_installment) || Number(input.end_installment) < 1) {
    errors.push(error("invalid_act_range", `${path}.end_installment`, "end_installment must be a positive integer."));
  }
  for (const key of ["title", "entry_pressure", "movement", "exit_pressure"]) {
    if (!nonEmpty(input[key])) errors.push(error("missing_required_field", `${path}.${key}`, `${key} is required.`));
  }
  for (const key of ["payoffs_owned", "reserved_for_later_acts"]) {
    if (!stringArray(input[key])) errors.push(error("invalid_string_array", `${path}.${key}`, `${key} must be an array of strings.`));
  }
  if (input.serial_engines_advanced !== void 0 && !stringArray(input.serial_engines_advanced)) {
    errors.push(error("invalid_string_array", `${path}.serial_engines_advanced`, "serial_engines_advanced must be an array of strings."));
  }
  if (!Array.isArray(input.installments)) {
    errors.push(error("invalid_installments", `${path}.installments`, "installments must be an array."));
  }
  const installments = [];
  if (Array.isArray(input.installments)) {
    input.installments.forEach((item, index) => {
      const parsed = parseInstallment(item, `${path}.installments[${index}]`);
      errors.push(...parsed.errors);
      if (parsed.value) installments.push(parsed.value);
    });
  }
  if (errors.length > 0) return { errors };
  const value = {
    number: Number(input.number),
    title: String(input.title).trim(),
    start_installment: Number(input.start_installment),
    end_installment: Number(input.end_installment),
    entry_pressure: String(input.entry_pressure).trim(),
    movement: String(input.movement).trim(),
    exit_pressure: String(input.exit_pressure).trim(),
    payoffs_owned: [...input.payoffs_owned],
    reserved_for_later_acts: [...input.reserved_for_later_acts],
    installments
  };
  if (input.serial_engines_advanced !== void 0) {
    value.serial_engines_advanced = [...input.serial_engines_advanced];
  }
  return { value, errors };
}
__name(parseAct, "parseAct");
function parseOptions(input, path) {
  if (!Array.isArray(input)) {
    return { errors: [error("invalid_options", path, "options must be an array.")] };
  }
  const errors = [];
  const options = [];
  input.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      errors.push(error("invalid_option", itemPath, "Option must be an object."));
      return;
    }
    if (!Number.isInteger(item.number)) errors.push(error("invalid_option_number", `${itemPath}.number`, "Option number must be an integer."));
    if (!REQUIRED_OPTION_ACTIONS.includes(item.action)) {
      errors.push(error("invalid_option_action", `${itemPath}.action`, "Option action must be approve, revise, or regenerate."));
    }
    if (!nonEmpty(item.label)) errors.push(error("missing_option_label", `${itemPath}.label`, "Option label is required."));
    if (errors.length === 0 || Number.isInteger(item.number) && nonEmpty(item.label)) {
      options.push({
        number: Number(item.number),
        action: item.action,
        label: String(item.label).trim()
      });
    }
  });
  return errors.length ? { errors } : { value: options, errors };
}
__name(parseOptions, "parseOptions");
function validateOptions(options, path = "options") {
  const errors = [];
  if (options.length !== 3) {
    errors.push(error("wrong_option_count", path, "Exactly three continuation options are required.", 3, options.length));
    return errors;
  }
  options.forEach((option, index) => {
    const expectedNumber = index + 1;
    const expectedAction = REQUIRED_OPTION_ACTIONS[index];
    if (option.number !== expectedNumber) {
      errors.push(error("wrong_option_number", `${path}[${index}].number`, "Option number is out of order.", expectedNumber, option.number));
    }
    if (option.action !== expectedAction) {
      errors.push(error("wrong_option_action", `${path}[${index}].action`, "Option action is out of order.", expectedAction, option.action));
    }
  });
  return errors;
}
__name(validateOptions, "validateOptions");
function validateInstallmentSequence(installments, count, path) {
  const errors = [];
  const numbers = installments.map((item) => item.number);
  const seen = /* @__PURE__ */ new Set();
  numbers.forEach((number, index) => {
    if (seen.has(number)) {
      errors.push(error("duplicate_installment_number", `${path}[${index}].number`, "Installment number is duplicated.", void 0, number));
    }
    seen.add(number);
  });
  for (let expected = 1; expected <= count; expected += 1) {
    if (!seen.has(expected)) {
      errors.push(error("missing_installment_number", path, `Installment ${expected} is missing.`, expected));
    }
  }
  if (installments.length !== count) {
    errors.push(error("wrong_installment_count", path, "Installment count does not match the declared count.", count, installments.length));
  }
  const sorted = [...installments].sort((a, b) => a.number - b.number);
  sorted.forEach((item, index) => {
    const isFinal = index === sorted.length - 1;
    if (!isFinal && !nonEmpty(item.next_sibling_start_state)) {
      errors.push(error("missing_next_sibling_start_state", `${path}[${index}].next_sibling_start_state`, "Non-final installments require a next-sibling start state."));
    }
    if (!isFinal) {
      const next = sorted[index + 1];
      if (next && !nonEmpty(next.entry_pressure)) {
        errors.push(error(
          "missing_next_entry_pressure",
          `${path}[${index + 1}].entry_pressure`,
          "The next installment requires an entry pressure."
        ));
      }
    }
  });
  return errors;
}
__name(validateInstallmentSequence, "validateInstallmentSequence");
function parseTelemetry(input) {
  if (!isRecord(input)) return {};
  const result = {};
  for (const key of [
    "route",
    "spine_events_per_installment",
    "beats_per_spine_event",
    "micro_beats_per_beat",
    "words_per_micro_beat"
  ]) {
    const value = input[key];
    if (typeof value === "string" || typeof value === "number") {
      result[key] = value;
    }
  }
  return result;
}
__name(parseTelemetry, "parseTelemetry");
function renderList(values, emptyLabel = "None.") {
  if (values.length === 0) return `- ${emptyLabel}`;
  return values.map((value) => `- ${value}`).join("\n");
}
__name(renderList, "renderList");
function calculateTelemetryText(count, telemetry) {
  const spine = telemetry.spine_events_per_installment;
  const beats = telemetry.beats_per_spine_event;
  const micro = telemetry.micro_beats_per_beat;
  const words = telemetry.words_per_micro_beat;
  if ([spine, beats, micro, words].every((value) => typeof value === "number")) {
    const total = count * Number(spine) * Number(beats) * Number(micro) * Number(words);
    return `${count} installments \xD7 ${spine} Spine events \xD7 ${beats} Beats \xD7 ${micro} Micro Beats \xD7 ${words} words = approximately **${total.toLocaleString("en-US")} words**.`;
  }
  return `Read-only telemetry is stored in the canonical payload.`;
}
__name(calculateTelemetryText, "calculateTelemetryText");

// src/plans/season-map.ts
var ALLOWED_POV_STATUSES = /* @__PURE__ */ new Set([
  "season_active",
  "delayed_entry",
  "intentionally_withheld",
  "inactive_this_season"
]);
function parsePovUtilization(input) {
  if (!Array.isArray(input)) {
    return { errors: [error("invalid_pov_utilization", "pov_utilization", "pov_utilization must be an array.")] };
  }
  const errors = [];
  const value = [];
  input.forEach((item, index) => {
    const path = `pov_utilization[${index}]`;
    if (!isRecord(item)) {
      errors.push(error("invalid_pov_record", path, "POV utilization entry must be an object."));
      return;
    }
    for (const key of ["character_id", "character_name", "distinct_information_channel", "independent_season_arc", "season_handoff"]) {
      if (!nonEmpty(item[key])) errors.push(error("missing_required_field", `${path}.${key}`, `${key} is required.`));
    }
    if (!ALLOWED_POV_STATUSES.has(String(item.status))) {
      errors.push(error("invalid_pov_status", `${path}.status`, "Unsupported season POV status."));
    }
    if (typeof item.required_this_season !== "boolean") {
      errors.push(error("invalid_required_this_season", `${path}.required_this_season`, "required_this_season must be a boolean."));
    }
    if (!Array.isArray(item.installment_numbers) || !item.installment_numbers.every((number) => Number.isInteger(number) && number > 0)) {
      errors.push(error("invalid_pov_installment_numbers", `${path}.installment_numbers`, "installment_numbers must be an array of positive integers."));
    }
    if (!stringArray(item.consequential_decisions)) {
      errors.push(error("invalid_string_array", `${path}.consequential_decisions`, "consequential_decisions must be an array of strings."));
    }
    if (item.activation_threshold !== void 0 && !nonEmpty(item.activation_threshold)) {
      errors.push(error("invalid_activation_threshold", `${path}.activation_threshold`, "activation_threshold must be a non-empty string when present."));
    }
    if (nonEmpty(item.character_id) && nonEmpty(item.character_name) && ALLOWED_POV_STATUSES.has(String(item.status)) && typeof item.required_this_season === "boolean" && Array.isArray(item.installment_numbers) && item.installment_numbers.every((number) => Number.isInteger(number) && number > 0) && nonEmpty(item.distinct_information_channel) && nonEmpty(item.independent_season_arc) && stringArray(item.consequential_decisions) && nonEmpty(item.season_handoff)) {
      const record = {
        character_id: item.character_id.trim(),
        character_name: item.character_name.trim(),
        status: item.status,
        required_this_season: item.required_this_season,
        installment_numbers: [...item.installment_numbers],
        distinct_information_channel: item.distinct_information_channel.trim(),
        independent_season_arc: item.independent_season_arc.trim(),
        consequential_decisions: [...item.consequential_decisions].map((entry) => entry.trim()).filter(Boolean),
        season_handoff: item.season_handoff.trim()
      };
      if (item.activation_threshold !== void 0) {
        record.activation_threshold = String(item.activation_threshold).trim();
      }
      value.push(record);
    }
  });
  return errors.length ? { errors } : { value, errors };
}
__name(parsePovUtilization, "parsePovUtilization");
function requiredActCount(installmentCount) {
  if (installmentCount <= 12) return 3;
  if (installmentCount <= 30) return 5;
  return 7;
}
__name(requiredActCount, "requiredActCount");
function flattenInstallments(acts) {
  return acts.flatMap((act) => act.installments);
}
__name(flattenInstallments, "flattenInstallments");
var seasonMapPlan = {
  id: "season_map",
  version: 1,
  parse(input) {
    const errors = [];
    if (!isRecord(input)) return { errors: [error("invalid_type", "canonical_payload", "Payload must be an object.")] };
    const requiredStrings = ["title", "target_installment_route", "start_condition", "end_condition"];
    for (const key of requiredStrings) {
      if (!nonEmpty(input[key])) errors.push(error("missing_required_field", key, `${key} is required.`));
    }
    if (!Number.isInteger(input.project_ref_id) || Number(input.project_ref_id) < 1) {
      errors.push(error("invalid_project_ref_id", "project_ref_id", "project_ref_id must be a positive integer."));
    }
    if (!Number.isInteger(input.season_number) || Number(input.season_number) < 1) {
      errors.push(error("invalid_season_number", "season_number", "season_number must be a positive integer."));
    }
    if (!Number.isInteger(input.installment_count) || Number(input.installment_count) < 1) {
      errors.push(error("invalid_installment_count", "installment_count", "installment_count must be a positive integer."));
    }
    if (input.status !== "draft") errors.push(error("invalid_status", "status", "Season Map status must be draft.", "draft", input.status));
    if (!stringArray(input.season_locks)) errors.push(error("invalid_string_array", "season_locks", "season_locks must be an array of strings."));
    if (!stringArray(input.continuity_handoff)) errors.push(error("invalid_string_array", "continuity_handoff", "continuity_handoff must be an array of strings."));
    const acts = [];
    if (!Array.isArray(input.acts)) {
      errors.push(error("invalid_acts", "acts", "acts must be an array."));
    } else {
      input.acts.forEach((item, index) => {
        const parsed = parseAct(item, `acts[${index}]`);
        errors.push(...parsed.errors);
        if (parsed.value) acts.push(parsed.value);
      });
    }
    const options = parseOptions(input.options, "options");
    errors.push(...options.errors);
    const povUtilization = parsePovUtilization(input.pov_utilization);
    errors.push(...povUtilization.errors);
    if (errors.length > 0 || !options.value || !povUtilization.value) return { errors };
    return {
      value: {
        project_ref_id: Number(input.project_ref_id),
        season_number: Number(input.season_number),
        title: String(input.title).trim(),
        status: "draft",
        installment_count: Number(input.installment_count),
        target_installment_route: String(input.target_installment_route).trim(),
        start_condition: String(input.start_condition).trim(),
        end_condition: String(input.end_condition).trim(),
        season_locks: [...input.season_locks],
        acts,
        continuity_handoff: [...input.continuity_handoff],
        pov_utilization: povUtilization.value,
        telemetry: parseTelemetry(input.telemetry),
        options: options.value
      },
      errors
    };
  },
  normalize(payload) {
    const acts = [...payload.acts].sort((a, b) => a.number - b.number).map((act) => ({
      ...act,
      installments: [...act.installments].sort((a, b) => a.number - b.number)
    }));
    const ordered = acts.flatMap((act) => act.installments);
    ordered.forEach((installment, index) => {
      const next = ordered[index + 1];
      if (next) {
        installment.next_sibling_start_state = next.entry_pressure.trim();
      } else {
        delete installment.next_sibling_start_state;
      }
    });
    return {
      ...payload,
      title: payload.title.trim(),
      season_locks: payload.season_locks.map((item) => item.trim()).filter(Boolean),
      pov_utilization: payload.pov_utilization.map((item) => ({ ...item, installment_numbers: [...new Set(item.installment_numbers)].sort((a, b) => a - b) })),
      options: normalizeContinuationOptions(
        payload.options,
        `Approve the Season Map and continue to ${payload.target_installment_route} planning`
      ),
      acts
    };
  },
  validate(payload) {
    const errors = [];
    const expectedActs = requiredActCount(payload.installment_count);
    if (payload.acts.length !== expectedActs) {
      errors.push(error("wrong_act_count", "acts", `A ${payload.installment_count}-installment season requires ${expectedActs} acts.`, expectedActs, payload.acts.length));
    }
    payload.acts.forEach((act, index) => {
      const expectedNumber = index + 1;
      if (act.number !== expectedNumber) {
        errors.push(error("wrong_act_number", `acts[${index}].number`, "Act numbers must be contiguous.", expectedNumber, act.number));
      }
      if (act.end_installment < act.start_installment) {
        errors.push(error("invalid_act_range", `acts[${index}]`, "Act end must be greater than or equal to act start."));
      }
      if (act.entry_pressure === act.exit_pressure) {
        errors.push(error("unchanged_act_pressure", `acts[${index}].exit_pressure`, "Act exit pressure must materially differ from act entry pressure."));
      }
      act.installments.forEach((installment, childIndex) => {
        if (installment.number < act.start_installment || installment.number > act.end_installment) {
          errors.push(error(
            "installment_outside_act_range",
            `acts[${index}].installments[${childIndex}].number`,
            "Installment falls outside its Act range.",
            `${act.start_installment}-${act.end_installment}`,
            installment.number
          ));
        }
      });
    });
    const sortedActs = [...payload.acts].sort((a, b) => a.number - b.number);
    if (sortedActs[0] && sortedActs[0].start_installment !== 1) {
      errors.push(error("act_range_gap", "acts[0].start_installment", "The first Act must start at installment 1.", 1, sortedActs[0].start_installment));
    }
    sortedActs.forEach((act, index) => {
      const next = sortedActs[index + 1];
      if (next && next.start_installment !== act.end_installment + 1) {
        errors.push(error("act_range_gap_or_overlap", `acts[${index + 1}].start_installment`, "Act ranges must be contiguous and nonoverlapping.", act.end_installment + 1, next.start_installment));
      }
    });
    const finalAct = sortedActs.at(-1);
    if (finalAct && finalAct.end_installment !== payload.installment_count) {
      errors.push(error("final_act_range_mismatch", `acts[${sortedActs.length - 1}].end_installment`, "The final Act must end at installment_count.", payload.installment_count, finalAct.end_installment));
    }
    const allInstallments = flattenInstallments(payload.acts);
    const installmentByNumber = new Map(allInstallments.map((item) => [item.number, item]));
    const chapteredRoute = /chaptered|long.installment|novella|novel/i.test(payload.target_installment_route) && !/chapterless/i.test(payload.target_installment_route);
    const seenPovIds = /* @__PURE__ */ new Set();
    payload.pov_utilization.forEach((pov, index) => {
      const path = `pov_utilization[${index}]`;
      if (seenPovIds.has(pov.character_id)) {
        errors.push(error("duplicate_pov_character", `${path}.character_id`, "POV character appears more than once.", void 0, pov.character_id));
      }
      seenPovIds.add(pov.character_id);
      const mustAppear = pov.status === "season_active" || pov.status === "delayed_entry" && pov.required_this_season;
      if (pov.status === "season_active" && !pov.required_this_season) {
        errors.push(error("active_pov_not_required", `${path}.required_this_season`, "A season_active POV must be required_this_season.", true, false));
      }
      if ((pov.status === "intentionally_withheld" || pov.status === "inactive_this_season") && pov.required_this_season) {
        errors.push(error("withheld_or_inactive_pov_required", `${path}.required_this_season`, "Withheld or inactive POVs cannot be required this season.", false, true));
      }
      if (pov.status === "delayed_entry" && !pov.activation_threshold) {
        errors.push(error("missing_delayed_pov_threshold", `${path}.activation_threshold`, "A delayed_entry POV requires an activation threshold."));
      }
      if (mustAppear) {
        if (!chapteredRoute && pov.installment_numbers.length === 0) {
          errors.push(error("missing_required_pov_allocation", `${path}.installment_numbers`, "Every required season POV must be allocated to at least one installment."));
        }
        if (pov.consequential_decisions.length === 0) {
          errors.push(error("missing_required_pov_decision", `${path}.consequential_decisions`, "Every required season POV must own at least one consequential decision."));
        }
      } else if (pov.installment_numbers.length > 0) {
        errors.push(error("withheld_or_inactive_pov_allocated", `${path}.installment_numbers`, "A POV not required this season cannot be allocated viewpoint installments."));
      }
      if (!chapteredRoute) pov.installment_numbers.forEach((number, allocationIndex) => {
        const installment = installmentByNumber.get(number);
        if (!installment) {
          errors.push(error("pov_installment_out_of_range", `${path}.installment_numbers[${allocationIndex}]`, "POV allocation references a missing installment.", void 0, number));
          return;
        }
        const installmentPovIds = getInstallmentPovIds(installment);
        if (!installmentPovIds.includes(pov.character_id)) {
          errors.push(error(
            "pov_allocation_not_realized",
            `${path}.installment_numbers[${allocationIndex}]`,
            "POV allocation is not present in the referenced installment's pov_character_ids.",
            pov.character_id,
            installmentPovIds
          ));
        }
      });
    });
    allInstallments.forEach((installment, index) => {
      const ids = getInstallmentPovIds(installment);
      if (!chapteredRoute && ids.length === 0) {
        errors.push(error("installment_missing_pov_assignment", `acts.installments[${index}].compiler_metadata.pov_character_ids`, "Every season-map installment must assign at least one POV in compiler_metadata.pov_character_ids."));
      }
      ids.forEach((id) => {
        const record = payload.pov_utilization.find((item) => item.character_id === id);
        if (!record) {
          errors.push(error("unknown_pov_character", `acts.installments[${index}].compiler_metadata.pov_character_ids`, "Installment references a POV absent from pov_utilization.", void 0, id));
        } else if (record.status === "intentionally_withheld" || record.status === "inactive_this_season") {
          errors.push(error("unavailable_pov_assigned", `acts.installments[${index}].compiler_metadata.pov_character_ids`, "Installment assigns a withheld or inactive POV.", void 0, id));
        }
      });
    });
    errors.push(...validateInstallmentSequence(allInstallments, payload.installment_count, "acts.installments"));
    errors.push(...validateMapReceipts(allInstallments, "acts.installments", payload.target_installment_route));
    errors.push(...validateOptions(payload.options));
    errors.push(...validateApprovalContinuationLabel(
      payload.options,
      `Approve the Season Map and continue to ${payload.target_installment_route} planning`
    ));
    return errors;
  },
  renderNormal(payload) {
    const lines = [
      `# ${payload.title}`,
      "",
      "**Status:** Draft for approval",
      "**Map type:** Season Map",
      `**Installments:** ${payload.installment_count}`,
      `**Target installment route:** ${payload.target_installment_route}`,
      "",
      "## Start Condition",
      "",
      payload.start_condition,
      "",
      "## End Condition",
      "",
      payload.end_condition,
      "",
      "## Season Locks",
      "",
      renderList(payload.season_locks),
      ""
    ];
    for (const act of payload.acts) {
      lines.push(
        `## Act ${act.number} \u2014 ${act.title} (Installments ${act.start_installment}\u2013${act.end_installment})`,
        "",
        `**Act entry pressure:** ${act.entry_pressure}`,
        "",
        `**Act movement:** ${act.movement}`,
        "",
        `**Act exit pressure:** ${act.exit_pressure}`,
        "",
        "**Payoffs owned:**",
        renderList(act.payoffs_owned),
        "",
        "**Reserved for later acts:**",
        renderList(act.reserved_for_later_acts),
        ""
      );
      for (const installment of act.installments) {
        lines.push(
          `### ${installment.number}. ${getInstallmentDisplayLabel(installment)}`,
          "",
          `**Dramatic focus:** ${installment.dramatic_focus}`,
          "",
          `**Installment movement:** ${installment.movement}`,
          "",
          `**State change:** ${installment.state_change}`,
          "",
          `**Continuation hook:** ${installment.continuation_hook}`,
          "",
          `**Why I chose this:** ${installment.reason}`,
          ""
        );
      }
    }
    lines.push(
      "## Continuity Handoff",
      "",
      renderList(payload.continuity_handoff),
      "",
      "## Telemetry",
      "",
      calculateTelemetryText(payload.installment_count, payload.telemetry),
      "",
      "## Options",
      "",
      ...payload.options.map((option) => `${option.number}. ${option.label}`)
    );
    return lines.join("\n").trim() + "\n";
  },
  renderDiagnostic(payload) {
    const normal = this.renderNormal(payload);
    const lines = [normal.trim(), "", "## Diagnostic POV Utilization", ""];
    for (const pov of payload.pov_utilization) {
      lines.push(
        `### ${pov.character_name}`,
        "",
        `**Status:** ${pov.status}`,
        "",
        `**Required this season:** ${pov.required_this_season ? "Yes" : "No"}`,
        "",
        `**Installments:** ${pov.installment_numbers.join(", ") || "None"}`,
        "",
        `**Distinct information channel:** ${pov.distinct_information_channel}`,
        "",
        `**Independent season arc:** ${pov.independent_season_arc}`,
        "",
        "**Consequential decisions:**",
        renderList(pov.consequential_decisions),
        "",
        `**Season handoff:** ${pov.season_handoff}`,
        ""
      );
    }
    lines.push("## Diagnostic Installment Architecture", "");
    for (const act of payload.acts) {
      for (const installment of act.installments) {
        lines.push(
          `### ${installment.number}. ${getInstallmentDisplayLabel(installment)}`,
          "",
          `**Entry pressure:** ${installment.entry_pressure}`,
          "",
          `**Exit pressure:** ${installment.exit_pressure}`,
          "",
          `**Pressure delta:** ${installment.pressure_delta}`,
          "",
          "**Unresolved pressures:**",
          renderList(installment.unresolved_pressures),
          "",
          `**Next sibling start state:** ${installment.next_sibling_start_state ?? payload.end_condition}`,
          "",
          `**Boundary reason:** ${installment.boundary_reason}`,
          "",
          "**Payoffs owned:**",
          renderList(installment.payoffs_owned),
          "",
          "**Reserved material:**",
          renderList(installment.reserved_material),
          ""
        );
      }
    }
    return lines.join("\n").trim() + "\n";
  },
  buildReceipt(payload, mode) {
    return {
      output_plan: this.id,
      output_plan_version: this.version,
      render_mode: mode,
      act_count: payload.acts.length,
      installment_count: payload.installment_count,
      renderer_version: 1,
      validator_version: 3,
      pov_record_count: payload.pov_utilization.length,
      required_pov_count: payload.pov_utilization.filter((item) => item.required_this_season).length,
      map_evidence_receipt: buildMapEvidenceReceipt(flattenInstallments(payload.acts))
    };
  }
};

// src/plans/serial-map.ts
function parseEngines(input) {
  if (!Array.isArray(input)) return { errors: [error("invalid_engines", "active_engines", "active_engines must be an array.")] };
  const errors = [];
  const engines = [];
  input.forEach((item, index) => {
    const path = `active_engines[${index}]`;
    if (!isRecord(item)) {
      errors.push(error("invalid_engine", path, "Engine must be an object."));
      return;
    }
    for (const key of ["id", "title", "current_pressure", "reserved_payoff"]) {
      if (!nonEmpty(item[key])) errors.push(error("missing_required_field", `${path}.${key}`, `${key} is required.`));
    }
    if (nonEmpty(item.id) && nonEmpty(item.title) && nonEmpty(item.current_pressure) && nonEmpty(item.reserved_payoff)) {
      engines.push({
        id: item.id.trim(),
        title: item.title.trim(),
        current_pressure: item.current_pressure.trim(),
        reserved_payoff: item.reserved_payoff.trim()
      });
    }
  });
  return errors.length ? { errors } : { value: engines, errors };
}
__name(parseEngines, "parseEngines");
var serialMapPlan = {
  id: "serial_map",
  version: 1,
  parse(input) {
    const errors = [];
    if (!isRecord(input)) return { errors: [error("invalid_type", "canonical_payload", "Payload must be an object.")] };
    if (!Number.isInteger(input.project_ref_id) || Number(input.project_ref_id) < 1) errors.push(error("invalid_project_ref_id", "project_ref_id", "project_ref_id must be a positive integer."));
    if (!nonEmpty(input.title)) errors.push(error("missing_required_field", "title", "title is required."));
    if (input.status !== "draft") errors.push(error("invalid_status", "status", "Serial Map status must be draft."));
    if (!Number.isInteger(input.horizon_count) || Number(input.horizon_count) < 1) errors.push(error("invalid_horizon_count", "horizon_count", "horizon_count must be a positive integer."));
    if (!stringArray(input.continuity_handoff)) errors.push(error("invalid_string_array", "continuity_handoff", "continuity_handoff must be an array of strings."));
    const engines = parseEngines(input.active_engines);
    errors.push(...engines.errors);
    const installments = [];
    if (!Array.isArray(input.installments)) errors.push(error("invalid_installments", "installments", "installments must be an array."));
    else {
      input.installments.forEach((item, index) => {
        const parsed = parseInstallment(item, `installments[${index}]`);
        errors.push(...parsed.errors);
        if (parsed.value) installments.push(parsed.value);
      });
    }
    const options = parseOptions(input.options, "options");
    errors.push(...options.errors);
    if (errors.length || !engines.value || !options.value) return { errors };
    return {
      value: {
        project_ref_id: Number(input.project_ref_id),
        title: String(input.title).trim(),
        status: "draft",
        horizon_count: Number(input.horizon_count),
        active_engines: engines.value,
        installments,
        continuity_handoff: [...input.continuity_handoff],
        telemetry: parseTelemetry(input.telemetry),
        options: options.value
      },
      errors
    };
  },
  normalize(payload) {
    const installments = [...payload.installments].sort((a, b) => a.number - b.number);
    installments.forEach((installment, index) => {
      const next = installments[index + 1];
      if (next) {
        installment.next_sibling_start_state = next.entry_pressure.trim();
      } else {
        delete installment.next_sibling_start_state;
      }
    });
    return {
      ...payload,
      options: normalizeContinuationOptions(
        payload.options,
        "Approve the Serial Map and continue to installment planning"
      ),
      installments
    };
  },
  validate(payload) {
    const errors = validateInstallmentSequence(payload.installments, payload.horizon_count, "installments");
    errors.push(...validateMapReceipts(payload.installments, "installments"));
    errors.push(...validateOptions(payload.options));
    errors.push(...validateApprovalContinuationLabel(
      payload.options,
      "Approve the Serial Map and continue to installment planning"
    ));
    const engineIds = new Set(payload.active_engines.map((engine) => engine.id));
    payload.installments.forEach((installment, index) => {
      const advanced = installment.serial_engines_advanced ?? [];
      if (advanced.length === 0) errors.push(error("installment_advances_no_engine", `installments[${index}].serial_engines_advanced`, "Each serial installment must advance at least one active engine."));
      advanced.forEach((id) => {
        if (!engineIds.has(id)) errors.push(error("unknown_serial_engine", `installments[${index}].serial_engines_advanced`, "Unknown serial engine.", void 0, id));
      });
    });
    return errors;
  },
  renderNormal(payload) {
    const lines = [
      `# ${payload.title}`,
      "",
      "**Status:** Draft for approval",
      "**Map type:** Serial Map",
      `**Planning horizon:** ${payload.horizon_count} installments`,
      "",
      "## Active Serial Engines",
      "",
      ...payload.active_engines.flatMap((engine) => [
        `### ${engine.title}`,
        `**Current pressure:** ${engine.current_pressure}`,
        `**Reserved payoff:** ${engine.reserved_payoff}`,
        ""
      ]),
      "## Installments",
      ""
    ];
    payload.installments.forEach((installment) => {
      lines.push(
        `### ${installment.number}. ${getInstallmentDisplayLabel(installment)}`,
        "",
        `**Dramatic focus:** ${installment.dramatic_focus}`,
        "",
        `**Installment movement:** ${installment.movement}`,
        "",
        `**State change:** ${installment.state_change}`,
        "",
        `**Continuation hook:** ${installment.continuation_hook}`,
        "",
        `**Why I chose this:** ${installment.reason}`,
        ""
      );
    });
    lines.push(
      "## Continuity Handoff",
      "",
      renderList(payload.continuity_handoff),
      "",
      "## Telemetry",
      "",
      calculateTelemetryText(payload.horizon_count, payload.telemetry),
      "",
      "## Options",
      "",
      ...payload.options.map((option) => `${option.number}. ${option.label}`)
    );
    return lines.join("\n").trim() + "\n";
  },
  renderDiagnostic(payload) {
    const lines = [this.renderNormal(payload).trim(), "", "## Diagnostic Installment Architecture", ""];
    payload.installments.forEach((installment) => {
      lines.push(
        `### ${installment.number}. ${getInstallmentDisplayLabel(installment)}`,
        `**Entry pressure:** ${installment.entry_pressure}`,
        `**Exit pressure:** ${installment.exit_pressure}`,
        `**Pressure delta:** ${installment.pressure_delta}`,
        `**Boundary reason:** ${installment.boundary_reason}`,
        `**Serial engines advanced:** ${(installment.serial_engines_advanced ?? []).join(", ") || "None"}`,
        ""
      );
    });
    return lines.join("\n").trim() + "\n";
  },
  buildReceipt(payload, mode) {
    return {
      output_plan: this.id,
      output_plan_version: this.version,
      render_mode: mode,
      horizon_count: payload.horizon_count,
      engine_count: payload.active_engines.length,
      renderer_version: 1,
      validator_version: 2,
      map_evidence_receipt: buildMapEvidenceReceipt(payload.installments)
    };
  }
};

// src/plans/serial-with-season-map.ts
function parseEngines2(input) {
  if (!Array.isArray(input)) return { errors: [error("invalid_engines", "active_engines", "active_engines must be an array.")] };
  const errors = [];
  const value = [];
  input.forEach((item, index) => {
    const path = `active_engines[${index}]`;
    if (!isRecord(item)) {
      errors.push(error("invalid_engine", path, "Engine must be an object."));
      return;
    }
    for (const key of ["id", "title", "current_pressure", "reserved_payoff"]) {
      if (!nonEmpty(item[key])) errors.push(error("missing_required_field", `${path}.${key}`, `${key} is required.`));
    }
    if (nonEmpty(item.id) && nonEmpty(item.title) && nonEmpty(item.current_pressure) && nonEmpty(item.reserved_payoff)) {
      value.push({
        id: item.id.trim(),
        title: item.title.trim(),
        current_pressure: item.current_pressure.trim(),
        reserved_payoff: item.reserved_payoff.trim()
      });
    }
  });
  return errors.length ? { errors } : { value, errors };
}
__name(parseEngines2, "parseEngines");
var serialWithSeasonMapPlan = {
  id: "serial_with_season_map",
  version: 1,
  parse(input) {
    const base = seasonMapPlan.parse(input);
    if (!base.value || !isRecord(input)) return { errors: base.errors };
    const engines = parseEngines2(input.active_engines);
    const errors = [...base.errors, ...engines.errors];
    if (errors.length || !engines.value) return { errors };
    return { value: { ...base.value, active_engines: engines.value }, errors };
  },
  normalize(payload) {
    const normalized = seasonMapPlan.normalize(payload);
    return {
      ...normalized,
      options: normalizeContinuationOptions(
        normalized.options,
        `Approve the Serial With Season Map and continue to ${payload.target_installment_route} planning`
      ),
      active_engines: [...payload.active_engines]
    };
  },
  validate(payload) {
    const basePayload = {
      ...payload,
      options: normalizeContinuationOptions(
        payload.options,
        `Approve the Season Map and continue to ${payload.target_installment_route} planning`
      )
    };
    const errors = seasonMapPlan.validate(basePayload);
    errors.push(...validateApprovalContinuationLabel(
      payload.options,
      `Approve the Serial With Season Map and continue to ${payload.target_installment_route} planning`
    ));
    const engineIds = new Set(payload.active_engines.map((engine) => engine.id));
    const referenced = /* @__PURE__ */ new Set();
    payload.acts.forEach((act, actIndex) => {
      (act.serial_engines_advanced ?? []).forEach((id) => {
        referenced.add(id);
        if (!engineIds.has(id)) errors.push(error("unknown_serial_engine", `acts[${actIndex}].serial_engines_advanced`, "Unknown serial engine.", void 0, id));
      });
      act.installments.forEach((installment, installmentIndex) => {
        const advanced = installment.serial_engines_advanced ?? [];
        if (advanced.length === 0) errors.push(error("installment_advances_no_engine", `acts[${actIndex}].installments[${installmentIndex}].serial_engines_advanced`, "Every hybrid-map installment must advance at least one serial engine."));
        advanced.forEach((id) => {
          referenced.add(id);
          if (!engineIds.has(id)) errors.push(error("unknown_serial_engine", `acts[${actIndex}].installments[${installmentIndex}].serial_engines_advanced`, "Unknown serial engine.", void 0, id));
        });
      });
    });
    if (payload.active_engines.length === 0) errors.push(error("missing_active_serial_engine", "active_engines", "At least one ongoing serial engine is required."));
    if (referenced.size === 0) errors.push(error("serial_engine_not_advanced", "acts", "The bounded season must advance at least one ongoing serial engine."));
    return errors;
  },
  renderNormal(payload) {
    const base = seasonMapPlan.renderNormal(payload);
    const engineSection = [
      "## Ongoing Serial Engines",
      "",
      ...payload.active_engines.flatMap((engine) => [
        `### ${engine.title}`,
        `**Current pressure:** ${engine.current_pressure}`,
        `**Reserved payoff:** ${engine.reserved_payoff}`,
        ""
      ])
    ].join("\n");
    return base.replace("## Start Condition", `${engineSection}
## Start Condition`);
  },
  renderDiagnostic(payload) {
    return seasonMapPlan.renderDiagnostic(payload);
  },
  buildReceipt(payload, mode) {
    return {
      ...seasonMapPlan.buildReceipt(payload, mode),
      output_plan: this.id,
      serial_engine_count: payload.active_engines.length
    };
  }
};

// src/plans/registry.ts
var plans = {
  season_map: seasonMapPlan,
  serial_map: serialMapPlan,
  serial_with_season_map: serialWithSeasonMapPlan
};
function getPlan(id) {
  return plans[id];
}
__name(getPlan, "getPlan");

// src/compile.ts
function isRenderMode(value) {
  return value === "normal" || value === "diagnostic";
}
__name(isRenderMode, "isRenderMode");
function compile(input) {
  if (!isRecord(input)) {
    return { status: 400, body: { ok: false, errors: [error("invalid_request", "", "Request body must be an object.")] } };
  }
  if (typeof input.output_plan !== "string") {
    return { status: 400, body: { ok: false, errors: [error("missing_output_plan", "output_plan", "output_plan is required.")] } };
  }
  const plan = getPlan(input.output_plan);
  if (!plan) {
    return { status: 404, body: { ok: false, errors: [error("unknown_output_plan", "output_plan", "Unknown output plan.", void 0, input.output_plan)] } };
  }
  if (input.output_plan_version !== plan.version) {
    return { status: 422, body: { ok: false, errors: [error("unsupported_output_plan_version", "output_plan_version", "Unsupported output-plan version.", plan.version, input.output_plan_version)] } };
  }
  if (!isRenderMode(input.render_mode)) {
    return { status: 400, body: { ok: false, errors: [error("invalid_render_mode", "render_mode", "render_mode must be normal or diagnostic.")] } };
  }
  const parsed = plan.parse(input.canonical_payload);
  if (!parsed.value || parsed.errors.length > 0) {
    return { status: 422, body: { ok: false, errors: parsed.errors } };
  }
  const normalized = plan.normalize(parsed.value);
  const validationErrors = plan.validate(normalized);
  if (validationErrors.length > 0) {
    return { status: 422, body: { ok: false, errors: validationErrors } };
  }
  const rendered = input.render_mode === "diagnostic" ? plan.renderDiagnostic(normalized) : plan.renderNormal(normalized);
  return {
    status: 200,
    body: {
      ok: true,
      output_plan: plan.id,
      output_plan_version: plan.version,
      normalized_payload: normalized,
      rendered_markdown: rendered,
      receipt: { ...plan.buildReceipt(normalized, input.render_mode), compiler_version: "1.3.7" }
    }
  };
}
__name(compile, "compile");

// src/index.ts
function jsonResponse(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({
        ok: true,
        service: "story-architect-planning-compiler",
        version: "1.3.7"
      });
    }
    if (url.pathname !== "/compile") {
      return jsonResponse(
        {
          ok: false,
          errors: [
            {
              code: "not_found",
              path: "",
              message: "Not found."
            }
          ]
        },
        404
      );
    }
    if (request.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          errors: [
            {
              code: "method_not_allowed",
              path: "",
              message: "POST required."
            }
          ]
        },
        405,
        { allow: "POST" }
      );
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          ok: false,
          errors: [
            {
              code: "invalid_json",
              path: "",
              message: "Invalid JSON."
            }
          ]
        },
        400
      );
    }
    const result = compile(body);
    return jsonResponse(result.body, result.status);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map