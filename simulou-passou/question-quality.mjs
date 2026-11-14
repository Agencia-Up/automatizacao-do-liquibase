const stopWords=new Set('a o as os um uma uns umas de da do das dos e em no na nos nas por para com sem que qual quais como se ao aos ou seu sua seus suas esse essa isso deste desta entre sobre mais menos'.split(' '));

const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

export function questionTemplateKey(question){
  if(question.similarityKey)return String(question.similarityKey);
  return fold(question.prompt)
    .replace(/r\$\s*[\d.,]+|\b\d+(?:[.,]\d+)?%?|\b(?:usd|brl)\b/g,' # ')
    .replace(/[^a-z0-9#]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function questionTokens(question){
  return new Set(questionTemplateKey(question).split(' ').filter(token=>token.length>2&&!stopWords.has(token)));
}

export function questionSimilarity(left,right){
  if(left.similarityKey||right.similarityKey)return left.similarityKey&&right.similarityKey&&String(left.similarityKey)===String(right.similarityKey)?1:0;
  if(questionTemplateKey(left)===questionTemplateKey(right))return 1;
  const a=questionTokens(left),b=questionTokens(right);
  if(a.size<4||b.size<4)return 0;
  let intersection=0;
  for(const token of a)if(b.has(token))intersection++;
  return intersection/(a.size+b.size-intersection);
}

export function questionsAreSimilar(left,right,threshold=.58){
  return questionSimilarity(left,right)>=threshold;
}
