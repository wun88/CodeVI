export interface PyExamineResult {
  type: string;
  name: string;
  description: string;
  file: string;
  'Module/Class': string;
  lineNumber: number;
  severity: string;
}
