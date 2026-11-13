import {escapeHtml as h} from './html.mjs';

// Original geometric marks. They describe a learning domain, not completion.
const marks={
 neural:'<path d="M26 34 59 21 91 39 62 64 29 83 26 34 62 64 91 87 91 39M59 21l3 43"/><circle cx="26" cy="34" r="8"/><circle cx="59" cy="21" r="7"/><circle cx="91" cy="39" r="9"/><circle cx="62" cy="64" r="12"/><circle cx="29" cy="83" r="7"/><circle cx="91" cy="87" r="7"/>',
 algorithm:'<path d="M23 87V66h17V47h18V28h19V13h21M20 98h82"/><rect x="24" y="68" width="13" height="19"/><rect x="43" y="49" width="13" height="38"/><rect x="62" y="30" width="13" height="57"/><rect x="81" y="15" width="13" height="72"/>',
 calculus:'<path d="M19 92h85M28 103V16M23 86C45 91 49 63 58 50S76 26 100 27M28 82l68-57"/><circle cx="59" cy="51" r="7"/>',
 code:'<path d="m43 31-25 29 25 29m34-58 25 29-25 29M68 19 52 101"/>',
 matrix:'<path d="M31 21H20v78h11M89 21h11v78H89"/><path d="m40 38 20-10 20 10-20 10-20-10v41l20 11 20-11V38M60 48v42M40 59l20 10 20-10"/>',
 probability:'<path d="M16 94h88M21 93c24 0 20-66 39-66s15 66 39 66"/><path d="M44 66v27m10-54v54m12-54v54m10-27v27"/>',
 system:'<rect x="18" y="19" width="34" height="34" rx="5"/><rect x="68" y="67" width="34" height="34" rx="5"/><path d="M52 36h33v31M35 53v31h33m6-9 11 10-11 10M76 57l9 10 9-10"/>',
 finance:'<path d="M19 96h85M30 26v50M25 40h10v24H25ZM59 43v43M54 53h10v22H54ZM88 16v51M83 26h10v15H83Z"/>',
 optimize:'<ellipse cx="60" cy="60" rx="45" ry="30" transform="rotate(-30 60 60)"/><ellipse cx="60" cy="60" rx="30" ry="20" transform="rotate(-30 60 60)"/><ellipse cx="60" cy="60" rx="15" ry="10" transform="rotate(-30 60 60)"/><path d="m92 22-8 22-15 3-8 12"/><circle cx="61" cy="59" r="4"/>',
 graph:'<path d="M25 30h69L59 91 25 30 20 87l74-57 8 58-43 3"/><circle cx="25" cy="30" r="7"/><circle cx="94" cy="30" r="7"/><circle cx="59" cy="91" r="7"/><circle cx="20" cy="87" r="7"/><circle cx="102" cy="88" r="7"/>',
 interval:'<path d="M17 30h86M18 61h37m12 0h35M17 92h18m10 0h17m10 0h16m8 0h17M60 31 36 60m24-29 24 29M36 62 25 91m11-29 17 29M84 62 78 91m6-29 21 29"/>',
 notebook:'<path d="M28 18h66v87H28zM19 29h18m-18 19h18m-18 19h18m-18 19h18M47 38h29M47 55h29M47 72h18"/>',
 problem:'<path d="M28 18h64v84H28zM42 42l7 7 15-17M42 70h34M42 85h23"/>',
};
const courseMarks={'zero-to-hero':'neural','micrograd':'neural','competitive-programmers-handbook':'algorithm','learn-optimization-path':'optimize',python:'code',calculus:'calculus','linear-algebra':'matrix',probability:'probability',contracts:'system',agent:'system',portfolio:'finance',kl:'neural','shortest-paths':'graph','dynamic-programming':'algorithm','segment-tree':'interval','bit-manipulation':'code'};
export function markName(id){return courseMarks[id]||(/^cph-/.test(id)?'algorithm':marks[id]?id:'system');}
export function learningIcon(id,{large=false}={}){const name=markName(id);return `<span class="learn-icon icon-${h(name)} ${large?'icon-large':''}" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${marks[name]}</svg></span>`;}
