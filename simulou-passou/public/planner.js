// Arithmetic planning only. No empirical dose-response or pass-probability model.
export function calculatePracticePlan(input) {
  const errors={};
  function number(key,min,max,optional=false,integer=true){
    const raw=input[key];
    if(optional&&(raw==null||String(raw).trim()===''))return null;
    const n=Number(raw);
    if(raw==null||String(raw).trim()===''||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n))){errors[key]=`Informe ${integer?'um número inteiro':'um número'} entre ${min} e ${max}.`;return null;}
    return n;
  }
  const sessions=number('sessions',1,1000),questions=number('questions',1,500);
  const minutes=number('minutes',1,480),review=number('review',0,240);
  const days=number('days',1,3650,true);
  const current=number('current',0,100,true,false),target=number('target',0,100,true,false);
  if(Object.keys(errors).length)return {valid:false,errors};
  return {valid:true,errors,sessions,totalResponses:sessions*questions,
    simulationMinutes:sessions*minutes,reviewMinutes:sessions*review,totalMinutes:sessions*(minutes+review),
    sessionsPerDay:days?sessions/days:null,minutesPerDay:days?sessions*(minutes+review)/days:null,
    gapPoints:current!==null&&target!==null?Math.max(0,target-current):null,
    current,target,passProbability:null,requiredSessionsForPass:null};
}
export function formatPlanTime(totalMinutes){
  const h=Math.floor(totalMinutes/60),m=Math.round(totalMinutes%60);
  return h?`${new Intl.NumberFormat('pt-BR').format(h)} h${m?' '+m+' min':''}`:`${m} min`;
}

// Deliberately invented toy curve for the user's local UI demonstration.
// The coefficients have no empirical calibration, predictive meaning or link
// to the research sources. Never call this a chance of passing an exam.
export function calculateIllustrativeScenario({sessions,minutesPerSimulation,minutesPerDay,target=80}){
  if(!Number.isInteger(sessions)||sessions<1||sessions>1000||!Number.isFinite(minutesPerSimulation)||minutesPerSimulation<1||!Number.isInteger(minutesPerDay)||minutesPerDay<1||minutesPerDay>720||!Number.isFinite(target)||target<21||target>94)return {valid:false};
  const baseline=20,ceiling=95,rate=.12;
  const index=ceiling-(ceiling-baseline)*Math.exp(-rate*sessions);
  const targetSessions=Math.ceil(-Math.log((ceiling-target)/(ceiling-baseline))/rate);
  const remainingSessions=Math.max(0,targetSessions-sessions);
  const sessionsPerDay=Math.floor(minutesPerDay/minutesPerSimulation);
  return {valid:true,fictional:true,index,target,targetSessions,remainingSessions,sessionsPerDay,
    remainingDays:remainingSessions===0?0:sessionsPerDay?Math.ceil(remainingSessions/sessionsPerDay):null,
    passProbability:null};
}
