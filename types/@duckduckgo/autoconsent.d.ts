declare module "@duckduckgo/autoconsent" {
  export type AutoConsentCMPRule = {
    name: string;
    vendorUrl?: string;
    prehideSelectors?: string[];
    runContext?: RunContext;
    intermediate?: boolean;
    cosmetic?: boolean;
    detectCmp: AutoConsentRuleStep[];
    detectPopup: AutoConsentRuleStep[];
    optOut: AutoConsentRuleStep[];
    optIn: AutoConsentRuleStep[];
    openCmp?: AutoConsentRuleStep[];
    test?: AutoConsentRuleStep[];
    comment?: string;
    minimumRuleStepVersion?: number;
  };

  export type RunContext = {
    main?: boolean;
    frame?: boolean;
    urlPattern?: string;
  };

  export type ElementSelector = string | string[];

  export type AutoConsentRuleStep = {
    optional?: boolean;
    comment?: string;
  } & Partial<ElementExistsRule> &
    Partial<ElementVisibleRule> &
    Partial<EvalRule> &
    Partial<WaitForRule> &
    Partial<WaitForVisibleRule> &
    Partial<ClickRule> &
    Partial<WaitForThenClickRule> &
    Partial<WaitRule> &
    Partial<HideRule> &
    Partial<IfRule> &
    Partial<AnyRule> &
    Partial<NegatedRule> &
    Partial<CookieContainsRule>;

  export type NegatedRule = {
    negated: boolean;
  };

  export type CookieContainsRule = {
    cookieContains: string;
  };

  export type ElementExistsRule = {
    exists: ElementSelector;
  };

  export type VisibilityCheck = "any" | "all" | "none";

  export type ElementVisibleRule = {
    visible: ElementSelector;
    check?: VisibilityCheck;
  };

  export type EvalRule = {
    eval: any;
  };

  export type WaitForRule = {
    waitFor: ElementSelector;
    timeout?: number;
  };

  export type WaitForVisibleRule = {
    waitForVisible: ElementSelector;
    timeout?: number;
    check?: VisibilityCheck;
  };

  export type ClickRule = {
    click: ElementSelector;
    all?: boolean;
  };

  export type WaitForThenClickRule = {
    waitForThenClick: ElementSelector;
    timeout?: number;
    all?: boolean;
  };

  export type WaitRule = {
    wait: number;
  };

  export type HideMethod = "display" | "opacity";

  export type HideRule = {
    hide: string;
    method?: HideMethod;
  };

  export type IfRule = {
    if: Partial<ElementExistsRule> & Partial<ElementVisibleRule>;
    then: AutoConsentRuleStep[];
    else?: AutoConsentRuleStep[];
  };

  export type AnyRule = {
    any: AutoConsentRuleStep[];
  };

  export type BackgroundMessage =
    | InitResponseMessage
    | EvalResponseMessage
    | OptOutMessage
    | OptInMessage
    | SelfTestMessage;

  export type ContentScriptMessage =
    | InitMessage
    | EvalMessage
    | DelayMessage
    | DetectedMessage
    | FoundMessage
    | OptOutResultMessage
    | OptInResultMessage
    | SelfTestResultMessage
    | DoneMessage
    | ErrorMessage
    | ReportMessage;

  export type BackgroundDevtoolsMessage =
    | DevtoolsAuditMessage
    | InstanceTerminatedMessage
    | InitResponseMessage;

  export type DevtoolsMessage = DevtoolsInitMessage;

  export type InitMessage = {
    type: "init";
    url: string;
  };

  export type EvalMessage = {
    type: "eval";
    id: string;
    code: string;
    snippetId?: any;
  };

  export type DelayMessage = {
    type: "visualDelay";
    timeout: number;
  };

  export type DetectedMessage = {
    type: "cmpDetected";
    cmp: string;
    url: string;
  };

  export type FoundMessage = {
    type: "popupFound";
    cmp: string;
    url: string;
  };

  export type OptOutResultMessage = {
    type: "optOutResult";
    cmp: string;
    result: boolean;
    scheduleSelfTest: boolean;
    url: string;
  };

  export type OptInResultMessage = {
    type: "optInResult";
    cmp: string;
    result: boolean;
    scheduleSelfTest: boolean;
    url: string;
  };

  export type SelfTestResultMessage = {
    type: "selfTestResult";
    cmp: string;
    result: boolean;
    url: string;
  };

  export type DoneMessage = {
    type: "autoconsentDone";
    cmp: string;
    isCosmetic: boolean;
    url: string;
  };

  export type ErrorMessage = {
    type: "autoconsentError";
    details: any;
  };

  export type InitResponseMessage = {
    type: "initResp";
    rules: RuleBundle;
    config: Config;
  };

  export type EvalResponseMessage = {
    type: "evalResp";
    id: string;
    result: any;
  };

  export type OptOutMessage = {
    type: "optOut";
  };

  export type OptInMessage = {
    type: "optIn";
  };

  export type SelfTestMessage = {
    type: "selfTest";
  };

  export type ReportMessage = {
    type: "report";
    instanceId: string; // A unique identifier for the frame.
    url: string; // Current frame URL
    mainFrame: boolean; // `true` iff this frame is the top frame.
    state: ConsentState;
  };

  export type DevtoolsAuditMessage = ReportMessage & {
    tabId: number;
    frameId: number;
  };

  export type InstanceTerminatedMessage = {
    type: "instanceTerminated";
    tabId: number;
    instanceId: string;
  };

  export type DevtoolsInitMessage = {
    type: "init";
    tabId: number;
  };


  export type MessageSender = (message: ContentScriptMessage) => Promise<void>;

  export interface AutoCMP {
      name: string;
      hasSelfTest: boolean;
      isIntermediate: boolean;
      isCosmetic: boolean;
      prehideSelectors?: string[];
      runContext: RunContext;
      checkRunContext(): boolean;
      checkFrameContext(isTop: boolean): boolean;
      hasMatchingUrlPattern(): boolean;
      detectCmp(): Promise<boolean>;
      detectPopup(): Promise<boolean>;
      optOut(): Promise<boolean>;
      optIn(): Promise<boolean>;
      openCmp(): Promise<boolean>;
      test(): Promise<boolean>;
  }

  export interface DomActionsProvider {
      click(selector: ElementSelector, all: boolean): Promise<boolean>;
      elementExists(selector: ElementSelector): boolean;
      elementVisible(selector: ElementSelector, check: VisibilityCheck): boolean;
      waitForElement(selector: ElementSelector, timeout?: number): Promise<boolean>;
      waitForVisible(selector: ElementSelector, timeout?: number, check?: VisibilityCheck): Promise<boolean>;
      waitForThenClick(selector: ElementSelector, timeout?: number, all?: boolean): Promise<boolean>;
      wait(ms: number): Promise<true>;
      hide(selector: string, method: HideMethod): boolean;
      prehide(selector: string): boolean;
      undoPrehide(): void;
      querySingleReplySelector(selector: string, parent?: any): HTMLElement[];
      querySelectorChain(selectors: string[]): HTMLElement[];
      elementSelector(selector: ElementSelector): HTMLElement[];
      waitForMutation(selector: ElementSelector): Promise<boolean>;
  }

  export type RuleBundle = {
      autoconsent: AutoConsentCMPRule[];
      compact?: CompactCMPRuleset;
      consentomatic?: { [name: string]: ConsentOMaticConfig };
  };

  export type AutoAction = 'optOut' | 'optIn' | null;

  export type Config = {
      enabled: boolean;
      autoAction: AutoAction;
      disabledCmps: string[];
      enablePrehide: boolean;
      enableCosmeticRules: boolean;
      detectRetries: number;
      isMainWorld: boolean;
      prehideTimeout: number;
      enableFilterList: boolean;
      enableHeuristicDetection: boolean;
      visualTest: boolean; // If true, the script will delay before every click action
      logs: {
          lifecycle: boolean;
          rulesteps: boolean;
          detectionsteps: boolean;
          evals: boolean;
          errors: boolean;
          messages: boolean;
          waits: boolean;
      };
  };

  export type LifecycleState =
      | 'loading'
      | 'initialized'
      | 'waitingForInitResponse'
      | 'started'
      | 'nothingDetected'
      | 'cosmeticFiltersDetected'
      | 'cmpDetected'
      | 'openPopupDetected'
      | 'runningOptOut'
      | 'runningOptIn'
      | 'optOutSucceeded'
      | 'optOutFailed'
      | 'optInSucceeded'
      | 'optInFailed'
      | 'done';

  export type ConsentState = {
      cosmeticFiltersOn: boolean; // true if cosmetic filter rules are currently applied.
      filterListReported: boolean; // true if the cosmetic filter list has been reported to the user.
      lifecycle: LifecycleState; // What point in the autoconsent lifecycle this script is at.
      prehideOn: boolean; // If the script is currently hiding preHide elements.
      findCmpAttempts: number; // Number of times we tried to find CMPs in this frame.
      detectedCmps: string[]; // Names of CMP rules where `detectCmp` returned true.
      detectedPopups: string[]; // Names of CMP rules where `detectPopup` returned true.
      heuristicPatterns: string[]; // Matched heuristic patterns
      heuristicSnippets: string[]; // Matched heuristic snippets
      selfTest: boolean | null; // null if no self test was run, otherwise it holds the result of the self test.
  };
}
