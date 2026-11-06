import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateIllustrativeScenario} from '../public/planner.js';
const base={minutesPerSimulation:45,minutesPerDay:90,target:80};
test('curva fictícia é crescente e limitada sem afirmar probabilidade real',()=>{const values=[1,10,1000].map(sessions=>calculateIllustrativeScenario({...base,sessions}));assert.ok(values[0].index<values[1].index);assert.ok(values[1].index<values[2].index);assert.ok(values.every(v=>v.index<=95&&v.fictional&&v.passProbability===null));assert.equal(values[1].targetSessions,14);assert.equal(values[1].remainingSessions,4);assert.equal(values[1].remainingDays,2);});
test('ritmo encurta o prazo, sem alterar o índice com a mesma quantidade',()=>{const a=calculateIllustrativeScenario({...base,sessions:10}),b=calculateIllustrativeScenario({...base,sessions:10,minutesPerDay:180});assert.equal(a.index,b.index);assert.equal(b.remainingDays,1);assert.equal(b.sessionsPerDay,4);});
test('um bloco insuficiente não produz prazo impossível',()=>{const r=calculateIllustrativeScenario({...base,sessions:1,minutesPerDay:15});assert.equal(r.sessionsPerDay,0);assert.equal(r.remainingDays,null);});
test('meta atingida no cenário não vira aprovação',()=>{const r=calculateIllustrativeScenario({...base,sessions:1000});assert.equal(r.remainingSessions,0);assert.equal(r.remainingDays,0);assert.equal(r.passProbability,null);});
test('rejeita entradas inválidas na simulação fictícia',()=>{for(const input of [{sessions:0},{sessions:1001},{sessions:1.5},{minutesPerDay:0},{minutesPerDay:721},{target:95},{target:100},{target:20},{minutesPerSimulation:0}])assert.equal(calculateIllustrativeScenario({...base,sessions:10,...input}).valid,false);});
