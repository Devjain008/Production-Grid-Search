const axios = require('axios');

/**
 * Base Policy Interface
 */
class Policy {
  async selectStrategy(context) {
    throw new Error('Policy.selectStrategy must be implemented');
  }

  async update(experience) {
    // Abstract hook for policy updates
  }
}

/**
 * Rule-Based Policy
 */
class RuleBasedPolicy extends Policy {
  constructor(options = {}) {
    super();
    this.fallbackStrategies = {
      batch: ['async', 'cache'],
      async: ['batch', 'pool'],
      pagination: ['index', 'cache'],
      index: ['cache', 'pagination'],
      cache: ['index', 'async'],
      pool: ['async', 'compression'],
      compression: ['pagination', 'cache']
    };
  }

  async selectStrategy({ hotspot, features, similarCases = [] }) {
    const primaryStrategy = hotspot.suggestedStrategy || 'none';

    if (primaryStrategy === 'none') {
      return {
        strategy: 'none',
        reason: 'Hotspot has no rule-based strategy mapping',
        skip: true,
        propensity: 1.0,
        policyMode: 'rule'
      };
    }

    const failuresForPrimary = similarCases.filter(
      c => c.strategy === primaryStrategy && (c.verdict === 'rejected' || c.verdict === 'errored')
    );

    if (failuresForPrimary.length >= 2) {
      const alternatives = this.fallbackStrategies[primaryStrategy] || [];
      for (const alt of alternatives) {
        const altFailures = similarCases.filter(
          c => c.strategy === alt && (c.verdict === 'rejected' || c.verdict === 'errored')
        );
        if (altFailures.length < 2) {
          return {
            strategy: alt,
            reason: `Primary strategy '${primaryStrategy}' failed ${failuresForPrimary.length} times on similar cases. Switched to fallback strategy '${alt}'.`,
            skip: false,
            propensity: 1.0,
            policyMode: 'rule'
          };
        }
      }

      return {
        strategy: 'none',
        reason: `Exhausted viable strategies for hotspot ${hotspot.function}. Primary '${primaryStrategy}' and all fallbacks failed >= 2 times.`,
        skip: true,
        propensity: 1.0,
        policyMode: 'rule'
      };
    }

    return {
      strategy: primaryStrategy,
      reason: `Selected rule-based strategy '${primaryStrategy}' based on defect category '${hotspot.category || 'performance'}'.`,
      skip: false,
      propensity: 1.0,
      policyMode: 'rule'
    };
  }

  async update(experience) {
    // No-op for rule-based policy
  }
}

/**
 * Phase 5 Learned Policy (Contextual Bandit / Thompson Sampling / Staged Router)
 * Communicates with FastAPI policy endpoints with automatic fallback to RuleBasedPolicy.
 */
class LearnedPolicy extends Policy {
  constructor(options = {}) {
    super();
    this.analyzerUrl = options.analyzerUrl || process.env.ANALYZER_URL || 'http://localhost:8000';
    this.fallbackRulePolicy = new RuleBasedPolicy(options);
    this.mode = options.mode || process.env.POLICY_MODE || 'learned'; // 'rule' | 'random' | 'shadow' | 'learned'
    this.shadowStats = { total: 0, agreements: 0 };
  }

  async selectStrategy(context) {
    const { hotspot, features = {}, similarCases = [], projectId, seed } = context;

    // Mode 1: Pure Rule-Based
    if (this.mode === 'rule') {
      return this.fallbackRulePolicy.selectStrategy(context);
    }

    // Prepare failure history from similarCases
    const failureHistory = similarCases.filter(c => c.verdict === 'rejected' || c.verdict === 'errored').map(c => ({
      file: c.file || hotspot.file,
      function: c.functionName || hotspot.function,
      strategy: c.strategy
    }));

    let learnedChoice = null;

    try {
      const response = await axios.post(`${this.analyzerUrl}/policy/select`, {
        hotspot,
        features,
        featureVersion: 1,
        projectId,
        failureHistory,
        seed
      }, { timeout: 1500 });

      if (response.data && response.data.success) {
        learnedChoice = {
          strategy: response.data.arm,
          reason: response.data.reason,
          propensity: response.data.propensity,
          scores: response.data.scores,
          maskedArms: response.data.masked,
          policyMode: response.data.mode,
          policyVersion: response.data.policyVersion,
          skip: response.data.arm === 'none'
        };
      }
    } catch (err) {
      console.warn(`[LearnedPolicy] FastAPI policy endpoint unreachable (${err.message}); falling back to RuleBasedPolicy.`);
    }

    // Mode 2: Shadow Mode (Rule acts, learned policy choice is logged for agreement tracking)
    if (this.mode === 'shadow') {
      const ruleChoice = await this.fallbackRulePolicy.selectStrategy(context);
      this.shadowStats.total++;
      if (learnedChoice && learnedChoice.strategy === ruleChoice.strategy) {
        this.shadowStats.agreements++;
      }
      const agreementPct = ((this.shadowStats.agreements / this.shadowStats.total) * 100).toFixed(1);
      console.log(`[LearnedPolicy:SHADOW] Rule='${ruleChoice.strategy}' vs Learned='${learnedChoice?.strategy || 'N/A'}' (Agreement: ${agreementPct}%)`);

      return {
        ...ruleChoice,
        shadowLearnedChoice: learnedChoice,
        policyMode: 'shadow'
      };
    }

    // Mode 3: Learned Mode
    if (learnedChoice && !learnedChoice.skip) {
      return learnedChoice;
    }

    // Fallback to Rule-based policy
    return this.fallbackRulePolicy.selectStrategy(context);
  }

  async update(experience) {
    const { features, strategy, reward, category, experimentId } = experience;
    try {
      await axios.post(`${this.analyzerUrl}/policy/update`, {
        features,
        featureVersion: 1,
        arm: strategy,
        reward,
        category: category || 'performance',
        experimentId: experimentId ? experimentId.toString() : null
      }, { timeout: 1500 });
    } catch (err) {
      // Non-blocking update failure
      console.warn(`[LearnedPolicy] Failed to push update to FastAPI analyzer: ${err.message}`);
    }
  }
}

module.exports = {
  Policy,
  RuleBasedPolicy,
  LearnedPolicy
};
