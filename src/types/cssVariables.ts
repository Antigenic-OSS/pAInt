export interface CSSVariableDefinition {
  value: string;         // raw value from stylesheet
  resolvedValue: string; // computed value from getComputedStyle
  selector: string;      // e.g. ':root'
}

export interface CSSVariableFamilyMember {
  name: string;
  suffix: string;
  value: string;
  resolvedValue: string;
}

export interface CSSVariableFamily {
  prefix: string;        // e.g. '--primary'
  members: CSSVariableFamilyMember[];
}
