/**
 * SSE Simulator for EVOLVE Autonomous Agent Loop
 * Simulates real-time agent progression, streaming micro-steps, budget consumption,
 * dropped connection recovery, and experiment verdict dispatch.
 */

import { DEMO_EXPERIMENTS } from './demoData';

export interface SSEAgentEvent {
  type: 'agent_node' | 'substep' | 'log' | 'experiment_complete' | 'budget_update' | 'job_complete' | 'error' | 'reconnecting';
  node?: 'Analyzer' | 'Retriever' | 'Patcher' | 'Critic' | 'Test' | 'Benchmark' | 'Decide' | 'Record';
  substep?: string;
  log?: { timestamp: string; level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'; agent: string; message: string };
  experiment?: any;
  budget?: { experimentsUsed: number; tokensUsed: number; benchmarkRunsUsed: number; minutesUsed: number };
  message?: string;
}

export class SSESimulator {
  private timer: any = null;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private listeners: ((event: SSEAgentEvent) => void)[] = [];

  private currentExpIndex: number = 0;
  private budget = {
    experimentsUsed: 0,
    tokensUsed: 1240,
    benchmarkRunsUsed: 0,
    minutesUsed: 0.2
  };

  public subscribe(listener: (event: SSEAgentEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: SSEAgentEvent) {
    this.listeners.forEach(l => l(event));
  }

  public start() {
    this.isPaused = false;
    this.isCancelled = false;
    this.currentExpIndex = 0;
    this.budget = { experimentsUsed: 0, tokensUsed: 1450, benchmarkRunsUsed: 0, minutesUsed: 0.4 };
    this.runNextStep();
  }

  public pause() {
    this.isPaused = true;
    if (this.timer) clearTimeout(this.timer);
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.runNextStep();
    }
  }

  public cancel() {
    this.isCancelled = true;
    if (this.timer) clearTimeout(this.timer);
    this.emit({
      type: 'log',
      log: {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        agent: 'SYSTEM',
        message: 'Optimization job cancelled by user. Preserving all accepted patches and recorded experiments.'
      }
    });
  }

  private schedule(fn: () => void, ms: number) {
    if (this.isPaused || this.isCancelled) return;
    this.timer = setTimeout(fn, ms);
  }

  private runNextStep() {
    if (this.isCancelled) return;

    // Cycle through experiments
    const exp = DEMO_EXPERIMENTS[this.currentExpIndex % DEMO_EXPERIMENTS.length];

    // 1. Analyzer Node
    this.emit({ type: 'agent_node', node: 'Analyzer' });
    this.emit({
      type: 'log',
      log: {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        agent: 'Analyzer',
        message: `Analyzing defect rank #${exp.defectRank}: ${exp.hotspot.file}:${exp.hotspot.line}`
      }
    });

    this.schedule(() => {
      // 2. Retriever Node
      this.emit({ type: 'agent_node', node: 'Retriever' });
      this.emit({
        type: 'log',
        log: {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          agent: 'Retriever',
          message: `Querying Qdrant memory for similar prior optimizations (${exp.hotspot.category})`
        }
      });

      this.schedule(() => {
        // 3. Patcher Node
        this.emit({ type: 'agent_node', node: 'Patcher' });
        this.budget.tokensUsed += 640;
        this.emit({ type: 'budget_update', budget: { ...this.budget } });
        this.emit({
          type: 'log',
          log: {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            agent: 'Patcher',
            message: `Formulating surgical diff with strategy '${exp.strategy}'`
          }
        });

        this.schedule(() => {
          // 4. Critic Node
          this.emit({ type: 'agent_node', node: 'Critic' });
          this.emit({
            type: 'log',
            log: {
              timestamp: new Date().toISOString(),
              level: exp.critic?.passed ? 'INFO' : 'WARN',
              agent: 'Critic',
              message: exp.critic?.reason || 'Inspecting diff for security, correctness, and reward-hacks'
            }
          });

          if (!exp.critic?.passed) {
            // Early rejection by critic
            this.budget.experimentsUsed += 1;
            this.emit({ type: 'experiment_complete', experiment: exp });
            this.emit({ type: 'budget_update', budget: { ...this.budget } });
            this.checkJobFinish();
            return;
          }

          this.schedule(() => {
            // 5. Test Node
            this.emit({ type: 'agent_node', node: 'Test' });
            this.emit({
              type: 'log',
              log: {
                timestamp: new Date().toISOString(),
                level: 'INFO',
                agent: 'Sandbox',
                message: 'Mounting patch in isolated container; running functional unit tests'
              }
            });

            this.schedule(() => {
              // 6. Benchmark Node with sub-steps
              this.emit({ type: 'agent_node', node: 'Benchmark' });
              this.runBenchmarkSubsteps(exp, 1);
            }, 800);
          }, 800);
        }, 800);
      }, 700);
    }, 700);
  }

  private runBenchmarkSubsteps(exp: any, runNum: number) {
    if (this.isCancelled || this.isPaused) return;

    if (runNum <= 5) {
      this.budget.benchmarkRunsUsed += 1;
      this.emit({
        type: 'substep',
        substep: `Executing empirical benchmark run ${runNum} of 5 (k6 profile)`
      });
      this.emit({
        type: 'log',
        log: {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          agent: 'Benchmark',
          message: `Benchmark run ${runNum}/5: measured p95=${exp.rawCandidateRuns ? exp.rawCandidateRuns[runNum - 1] : 148}ms`
        }
      });
      this.emit({ type: 'budget_update', budget: { ...this.budget } });

      this.schedule(() => {
        this.runBenchmarkSubsteps(exp, runNum + 1);
      }, 500);
    } else {
      // 7. Decide Node
      this.emit({ type: 'agent_node', node: 'Decide' });
      this.emit({
        type: 'log',
        log: {
          timestamp: new Date().toISOString(),
          level: exp.verdict === 'accepted' ? 'INFO' : 'WARN',
          agent: 'Decide',
          message: exp.stats?.verdictReason || `Evaluated statistical significance. Verdict: ${exp.verdict.toUpperCase()}`
        }
      });

      this.schedule(() => {
        // 8. Record Node
        this.emit({ type: 'agent_node', node: 'Record' });
        this.budget.experimentsUsed += 1;
        this.emit({ type: 'experiment_complete', experiment: exp });
        this.emit({ type: 'budget_update', budget: { ...this.budget } });

        this.checkJobFinish();
      }, 700);
    }
  }

  private checkJobFinish() {
    this.currentExpIndex += 1;
    if (this.currentExpIndex >= 3) {
      this.emit({
        type: 'job_complete',
        message: 'Optimization budget reached or all top bottlenecks evaluated.'
      });
    } else {
      this.schedule(() => {
        this.runNextStep();
      }, 1000);
    }
  }
}

export const sseSimulator = new SSESimulator();
