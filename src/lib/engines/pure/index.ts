import type { PureOp } from "../types";

import { boxShadow, colorConvert, cssGradient } from "./css";
import { age, cronExplain, dateDiff, timestampConvert } from "./datetime";
import {
  base64Decode,
  base64Encode,
  htmlDecode,
  htmlEncode,
  jwtDecode,
  queryParse,
  urlDecode,
  urlEncode,
} from "./encoding";
import { hashText, hmacText, passwordStrength } from "./hash";
import {
  csvToJson,
  csvToMarkdown,
  jsonFormat,
  jsonMinify,
  jsonToCsv,
  jsonToTypeScript,
  jsonToXml,
  jsonToYaml,
  jsonValidate,
  tomlToJson,
  xmlToJson,
  yamlToJson,
} from "./json";
import {
  aspectRatio,
  baseConvert,
  bmi,
  compoundInterest,
  discount,
  gst,
  loanEmi,
  numberToWords,
  percentage,
  romanNumeral,
  sip,
  tip,
  unitConvert,
} from "./numbers";
import { qrGenerate } from "./qr";
import { passwordGenerate, randomString, uuidGenerate } from "./random";
import {
  caseConvert,
  dedupeLines,
  findReplace,
  htmlToMarkdown,
  loremIpsum,
  markdownToHtml,
  regexTest,
  removeLineBreaks,
  slugify,
  sortLines,
  textDiff,
  wordCount,
} from "./text";

/**
 * Every `pure` engine op, keyed by the `op` name in the tool registry. The
 * registry validator checks that each pure tool's op has an entry here, so a
 * typo fails the build rather than the page.
 */
export const PURE_OPS: Record<string, PureOp> = {
  // Encoding
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  htmlEncode,
  htmlDecode,
  jwtDecode,
  queryParse,

  // JSON and friends
  jsonFormat,
  jsonMinify,
  jsonValidate,
  jsonToYaml,
  yamlToJson,
  jsonToCsv,
  csvToJson,
  csvToMarkdown,
  jsonToXml,
  xmlToJson,
  tomlToJson,
  jsonToTypeScript,

  // Text
  caseConvert,
  wordCount,
  sortLines,
  dedupeLines,
  removeLineBreaks,
  findReplace,
  regexTest,
  textDiff,
  markdownToHtml,
  htmlToMarkdown,
  slugify,
  loremIpsum,

  // Hash & random
  hashText,
  hmacText,
  passwordStrength,
  passwordGenerate,
  randomString,
  uuidGenerate,
  qrGenerate,

  // Date & time
  timestampConvert,
  cronExplain,
  age,
  dateDiff,

  // Numbers
  unitConvert,
  percentage,
  loanEmi,
  sip,
  compoundInterest,
  gst,
  discount,
  tip,
  bmi,
  aspectRatio,
  baseConvert,
  romanNumeral,
  numberToWords,

  // CSS
  colorConvert,
  cssGradient,
  boxShadow,
};

export function getPureOp(name: string): PureOp | undefined {
  return PURE_OPS[name];
}
