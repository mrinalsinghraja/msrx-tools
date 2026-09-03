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
import { decryptText, encryptText, rsaKeypair, rsaSign, shamirCombine, shamirSplit, totpGenerate } from "./crypto";
import { gitignoreBuild, mockData } from "./generate";
import { logAnonymize, svgOptimize, unicodeInspect } from "./inspect";
import { cidrCalculate, dnsParse, userAgentParse } from "./network";
import { qrGenerate } from "./qr";
import { readability } from "./readability";
import {
  boldText,
  bubbleText,
  cursiveText,
  fancyText,
  fullwidthText,
  italicText,
  smallCapsText,
  strikethroughText,
  superscriptText,
  upsideDownText,
} from "./unicode-style";
import { graphqlFormat, jsonSchemaGenerate, sqlToTypeScript } from "./schema";
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

  // Schema and pipelines
  jsonSchemaGenerate,
  sqlToTypeScript,
  graphqlFormat,

  // Network and clients
  cidrCalculate,
  dnsParse,
  userAgentParse,

  // Inspection and sanitising
  unicodeInspect,
  svgOptimize,
  logAnonymize,

  // Generators
  gitignoreBuild,
  mockData,

  // Cryptography
  encryptText,
  decryptText,
  totpGenerate,
  shamirSplit,
  shamirCombine,
  rsaKeypair,
  rsaSign,

  // Reading
  readability,

  // Unicode text styling
  fancyText,
  boldText,
  italicText,
  cursiveText,
  smallCapsText,
  strikethroughText,
  upsideDownText,
  superscriptText,
  bubbleText,
  fullwidthText,

  // CSS
  colorConvert,
  cssGradient,
  boxShadow,
};

export function getPureOp(name: string): PureOp | undefined {
  return PURE_OPS[name];
}
