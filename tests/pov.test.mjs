import test from "node:test";
import assert from "node:assert/strict";
import compiler from "../src/index.js";

function request(route, assigned = false) {
  const acts = [1,2,3].map(number => ({
    number, title: "Act " + number, start_installment: number, end_installment: number,
    entry_pressure: "Pressure " + number, movement: "Movement " + number,
    exit_pressure: "Changed " + number, payoffs_owned: [], reserved_for_later_acts: [],
    installments: [{
      number, movement: `Opening: A missing traveler ${number}\nAct I: Searchers discover a blocked road\nAct II: A witness redirects the search\nAct III: The traveler returns safely`, reason: "Cause " + number,
      dramatic_focus: "Focus " + number, state_change: "Changed " + number,
      continuation_hook: "Hook " + number, continuation_hook_type: "decision",
      entry_pressure: "Pressure " + number, exit_pressure: "Changed " + number,
      pressure_delta: "Escalation", unresolved_pressures: [],
      boundary_reason: "Boundary", payoffs_owned: [], reserved_material: [],
      construction_receipt: {
        version: 1, candidate_id: `candidate-${number}`, constructed_before_planner_fields: true,
        question_order: ["What happens?", "What gets in the way?", "What's the consequence?", "What is left unresolved?"],
        answers: {
          what_happens: `A traveler ${number} disappears during a storm.`,
          what_gets_in_the_way: `A washed-out bridge blocks the search party's route ${number}.`,
          whats_the_consequence: `The group splits up and loses its only safe crossing ${number}.`,
          what_is_left_unresolved: `One searcher is stranded while the storm worsens ${number}.`
        },
        this_is_the_story_where: `This is where the searchers must rescue a missing traveler despite the storm ${number}.`
      },
      route_capacity_receipt: {
        version: 1, candidate_id: `candidate-${number}`, target_installment_route: route,
        route_scale_basis: `The linked rescue, conflict and aftermath sustain the full ${route} installment without padding.`,
        substantive_turns: [`The search reveals a second route ${number}.`, `The group loses its safe crossing ${number}.`],
        interacting_threads: [`The storm isolates one searcher ${number}.`, `The missing traveler's clue redirects the group ${number}.`],
        opening_directions: [`Return to the settlement ${number}.`, `Cross the flooded ravine ${number}.`],
        choice_altering_consequence: `A searcher is stranded and the group must choose whom to rescue first ${number}.`
      },
      ...(assigned ? { compiler_metadata: { pov_character_ids: ["p1"] } } : {})
    }]
  }));
  return {output_plan:"season_map",output_plan_version:1,render_mode:"normal",
    canonical_payload:{project_ref_id:1,season_number:1,title:"Test Season",status:"draft",
      installment_count:3,target_installment_route:route,start_condition:"Beginning",end_condition:"Ending",
      season_locks:[],continuity_handoff:[],acts,
      pov_utilization:[{character_id:"p1",character_name:"One",status:"season_active",
        required_this_season:true,installment_numbers:assigned?[1,2,3]:[],
        distinct_information_channel:"Unique",independent_season_arc:"Arc",
        consequential_decisions:["Decision"],season_handoff:"Handoff"}],
      options:[{number:1,action:"approve",label:"Approve the Season Map and continue to "+route+" planning"},
        {number:2,action:"revise",label:"Revise"},{number:3,action:"regenerate",label:"Regenerate"}]
    }
  };
}
async function compile(payload) {
  const response=await compiler.fetch(new Request("https://internal/compile",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)
  }));
  return {status:response.status,body:await response.json()};
}
test("chaptered map accepts eligible POV roster without exact installment assignments",async()=>{
  const result=await compile(request("Chaptered Installment"));
  assert.equal(result.status,200,JSON.stringify(result.body.errors));
  assert.equal(result.body.ok,true);
});
test("long installment map defers POV assignment to chapters",async()=>{
  const result=await compile(request("Long Installment"));
  assert.equal(result.status,200,JSON.stringify(result.body.errors));
});
test("chapterless map retains installment POV allocation requirement",async()=>{
  const result=await compile(request("Chapterless"));
  assert.equal(result.status,422);
  assert.ok(result.body.errors.some(e=>e.code==="installment_missing_pov_assignment"));
});
test("chaptered map rejects an explicitly assigned inactive POV",async()=>{
  const payload=request("Chaptered Installment",true);
  payload.canonical_payload.pov_utilization[0].status="inactive_this_season";
  payload.canonical_payload.pov_utilization[0].required_this_season=false;
  payload.canonical_payload.pov_utilization[0].installment_numbers=[];
  const result=await compile(payload);
  assert.equal(result.status,422);
  assert.ok(result.body.errors.some(e=>e.code==="unavailable_pov_assigned"));
});

test("map rejects a single abbreviated movement",async()=>{
  const payload=request("Chaptered Installment");
  payload.canonical_payload.acts[0].installments[0].movement="A traveler returns.";
  const result=await compile(payload);
  assert.equal(result.status,422);
  assert.ok(result.body.errors.some(e=>e.code==="missing_minibook_structure"));
});
test("map rejects repeated movements",async()=>{
  const payload=request("Chaptered Installment");
  payload.canonical_payload.acts[0].installments[0].movement="Opening: Same\nAct I: Same\nAct II: Same\nAct III: Same";
  const result=await compile(payload);
  assert.equal(result.status,422);
  assert.ok(result.body.errors.some(e=>e.code==="invalid_minibook_movements"));
});
test("map preserves mini-book movements in rendered output",async()=>{
  const result=await compile(request("Chaptered Installment"));
  assert.equal(result.status,200,JSON.stringify(result.body.errors));
  for(const label of ["Opening:","Act I:","Act II:","Act III:"]) assert.ok(result.body.rendered_markdown.includes(label));
});
