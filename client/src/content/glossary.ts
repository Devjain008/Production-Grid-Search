/**
 * Single source of truth for all technical, non-functional, and statistical terminology.
 * Grade 8 reading level: plain-language, real-life analogies, zero unexplained jargon.
 */

export interface GlossaryEntry {
  id: string;
  title: string;
  category: 
    | 'Latency & Speed' 
    | 'Throughput & Capacity' 
    | 'Resource & Stability' 
    | 'Reliability & Errors' 
    | 'Static Analysis & Profiling'
    | 'AI & Learning' 
    | 'Statistics & Verification' 
    | 'Load Profiles & Verification' 
    | 'Security & Containment' 
    | 'Optimization Strategies';
  simple: string; // 1-2 sentences, everyday analogy, <= 45 words
  why: string;    // One sentence tied directly to this product
  goodHint?: string; // Rule of thumb
  technical?: string; // Formula/formal definition for expert mode
  explain?: (value: any) => string; // Dynamic contextual explanation from live data
  tags?: string[]; // Screens where used: overview, baseline, defects, optimize, memory, policy, reports, settings
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // --- Latency & Speed ---
  p50: {
    id: 'p50',
    title: 'Typical visitor speed (p50 median)',
    category: 'Latency & Speed',
    simple: 'The middle wait time. If 100 people visit your site, half were served faster than this, and half were slower.',
    why: 'Shows what your everyday user experiences when everything runs normally.',
    goodHint: 'Under 100 ms feels instant; under 250 ms is standard web performance.',
    technical: 'The 50th percentile of the latency distribution: P(latency <= p50) = 0.50.',
    explain: (val) => {
      const n = typeof val === 'number' ? Math.round(val) : val;
      return `Your typical visitor waited ${n} ms. Half of your visitors got an answer even faster than that.`;
    },
    tags: ['overview', 'baseline', 'reports']
  },
  p90: {
    id: 'p90',
    title: 'Slower 10% of visits (p90)',
    category: 'Latency & Speed',
    simple: 'The speed limit that 9 out of 10 visits beat. Only 10 in 100 visits take longer than this.',
    why: 'Spots early slowdowns before they spread to your entire user base.',
    goodHint: 'Aim for under 200 ms for snappy web applications.',
    technical: '90th percentile: 90% of observed request latencies fall at or below this value.',
    explain: (val) => `90% of requests finished within ${val} ms, while 10% experienced longer delays.`,
    tags: ['baseline', 'metrics']
  },
  p95: {
    id: 'p95',
    title: 'Slowest 5% of visits (p95 latency)',
    category: 'Latency & Speed',
    simple: 'The response time for your slower visitors. Out of 100 people, 95 had faster service and 5 waited longer than this.',
    why: 'When p95 is high, visitors leave frustrated, abandon carts, or complain that the app feels sluggish.',
    goodHint: 'Under 200 ms is great; over 500 ms will start annoying your users.',
    technical: '95th percentile latency: standard industry Service Level Agreement (SLA) threshold.',
    explain: (val) => {
      const n = typeof val === 'number' ? Math.round(val) : val;
      return `Your p95 is ${n} ms: 95 out of 100 visitors got their response in ${n} ms or faster.`;
    },
    tags: ['overview', 'baseline', 'optimize', 'reports']
  },
  p99: {
    id: 'p99',
    title: 'Worst 1% outlier visits (p99 latency)',
    category: 'Latency & Speed',
    simple: 'The extreme worst-case wait. 99 out of 100 visitors got faster service; only 1 out of 100 hit this delay.',
    why: 'Catches nasty freezes like database locks, cold starts, or memory pauses.',
    goodHint: 'Keep under 1,000 ms even during heavy traffic surges.',
    technical: '99th percentile: detects severe tail latency outliers and micro-stalls.',
    explain: (val) => `Only 1 out of 100 visitors waited longer than ${val} ms.`,
    tags: ['baseline', 'reports']
  },

  // --- Throughput & Capacity ---
  throughput: {
    id: 'throughput',
    title: 'Requests handled per second (RPS)',
    category: 'Throughput & Capacity',
    simple: 'How many completed requests your server handles every second, like cars passing through a highway tollbooth.',
    why: 'Tells you if your server can keep up when lots of visitors arrive at once.',
    goodHint: '50-100 RPS per CPU core is normal for Node.js web services.',
    technical: 'Total completed HTTP transactions divided by test duration in seconds (RPS = TotalRequests / DurationSec).',
    explain: (val) => `Your server successfully finished ${val} requests every second.`,
    tags: ['overview', 'baseline', 'reports']
  },
  peak_capacity: {
    id: 'peak_capacity',
    title: 'Peak surge capacity',
    category: 'Throughput & Capacity',
    simple: 'The absolute highest burst of traffic your app handled without dropping connections or crashing.',
    why: 'Shows if your app can survive a sudden flash sale or viral news post.',
    goodHint: 'Should be at least 30% higher than your normal everyday traffic.',
    technical: 'Highest 1-second moving average throughput recorded during load bursts.',
    explain: (val) => `During traffic surges, your app peaked at ${val} requests per second.`,
    tags: ['baseline']
  },
  steady_traffic: {
    id: 'steady_traffic',
    title: 'Safe steady traffic',
    category: 'Throughput & Capacity',
    simple: 'The cruising speed where your app runs smoothly all day with fast speeds and no strain.',
    why: 'Your recommended baseline traffic target for reliable day-to-day operations.',
    goodHint: 'Operate within this number so response times stay fast and steady.',
    technical: 'Sustainable load level maintaining p95 latency under target SLA with zero connection errors.',
    explain: (val) => `Your service runs comfortably at up to ${val} req/sec without breaking a sweat.`,
    tags: ['baseline']
  },
  breaking_point: {
    id: 'breaking_point',
    title: 'Breaking point & saturation',
    category: 'Throughput & Capacity',
    simple: 'The traffic weight where your server begins to crack, drop connections, or slow down sharply.',
    why: 'Tells you the exact user crowd size that will crash your current setup if you do not scale up.',
    goodHint: 'Your expected peak traffic should stay under 70% of this limit.',
    technical: 'The concurrency or request threshold where error rates exceed 1% or latency increases exponentially.',
    explain: (val) => `Your app showed signs of stress starting at ${val} concurrent virtual visitors.`,
    tags: ['baseline']
  },
  concurrency_limit: {
    id: 'concurrency_limit',
    title: 'Safe concurrency limit',
    category: 'Throughput & Capacity',
    simple: 'The maximum recommended number of people browsing at the exact same instant, like an elevator weight limit.',
    why: 'Used to set safety guardrails on your load balancer and rate limiters.',
    goodHint: 'Set to about 75% of your breaking point for a comfortable safety buffer.',
    technical: 'Recommended maximum simultaneous active Virtual Users (VUs) for SLA compliance.',
    explain: (val) => `We recommend limiting concurrency to ${val} active visitors at a time.`,
    tags: ['baseline']
  },
  capacity_classification: {
    id: 'capacity_classification',
    title: 'Capacity health grade',
    category: 'Throughput & Capacity',
    simple: 'An overall badge (High, Medium, or Bottlenecked) showing how efficiently your code turns CPU into completed visits.',
    why: 'Gives non-technical stakeholders an instant health check on whether the app is ready for launch.',
    goodHint: 'Aim for High or Medium before launching marketing campaigns.',
    technical: 'Categorical rating derived from throughput vs CPU and memory saturation.',
    tags: ['baseline']
  },

  // --- Resource & Stability ---
  event_loop_lag: {
    id: 'event_loop_lag',
    title: 'Node.js event loop delay',
    category: 'Resource & Stability',
    simple: 'The pause before Node.js handles the next task. Node is like a single cashier; if they freeze to count the vault, all customers wait.',
    why: 'Synchronous loops or slow file reads freeze the entire app for all visitors at once.',
    goodHint: 'Under 15 ms is smooth; over 50 ms means the server is freezing.',
    technical: 'Delay in milliseconds between scheduling and executing an asynchronous timer callback (libuv lag).',
    explain: (val) => {
      const n = typeof val === 'number' ? Math.round(val) : val;
      return `The event loop paused for ${n} ms. ${n < 15 ? 'Tasks flowed without noticeable delay.' : 'Visitors felt pauses while Node was busy on heavy sync work.'}`;
    },
    tags: ['baseline', 'defects', 'reports']
  },
  heap_memory: {
    id: 'heap_memory',
    title: 'Memory footprint & heap slope',
    category: 'Resource & Stability',
    simple: 'The RAM memory your application uses. The slope tells us if memory recovers or leaks like a boat taking on water.',
    why: 'If memory creeps higher and never goes down, your server will eventually run out of memory and crash.',
    goodHint: 'The line should stay flat or dip when garbage collection cleans up.',
    technical: 'V8 heapUsed telemetry; positive slope over extended runs indicates unbounded reference accumulation (leak).',
    explain: (val) => `Your app used ${val} MB of RAM memory during the test run.`,
    tags: ['baseline', 'metrics']
  },
  error_rate: {
    id: 'error_rate',
    title: 'Error rate (failed requests)',
    category: 'Reliability & Errors',
    simple: 'The percentage of visits that failed with error codes or timed out, like packages arriving damaged.',
    why: 'Even 1% failure means 10 out of every 1,000 visitors experienced broken buttons or error pages.',
    goodHint: 'Under 0.1% for normal web apps (99.9% success rate).',
    technical: 'Ratio of failed HTTP requests (status >= 400 or timeouts) to total requests: Errors / Total.',
    explain: (val) => {
      const pct = typeof val === 'number' ? (val * (val <= 1 ? 100 : 1)).toFixed(2) : val;
      return `Your error rate was ${pct}%. ${Number(pct) < 0.1 ? 'Almost every single request succeeded!' : 'Some visitors experienced errors or broken responses.'}`;
    },
    tags: ['overview', 'baseline', 'reports']
  },
  nfr_scorecard: {
    id: 'nfr_scorecard',
    title: 'Non-Functional Requirements (NFR) scorecard',
    category: 'Reliability & Errors',
    simple: 'A report card grading how well your system performs under load: speed, reliability, and stability.',
    why: 'A feature might work for one test user, but NFRs prove it won’t crash when thousands show up.',
    goodHint: 'Aim for a score of 85/100 or higher for production launch.',
    technical: 'Multi-criteria composite score evaluating p95 SLA, availability (error rate), event loop delay, and memory.',
    tags: ['baseline', 'reports']
  },
  virtual_request: {
    id: 'virtual_request',
    title: 'Interactive virtual request probe',
    category: 'Reliability & Errors',
    simple: 'A live test message sent directly to your isolated sandbox app so you can test buttons and check responses.',
    why: 'Lets you safely test endpoints and inspect real server answers without leaving your browser.',
    goodHint: 'Look for green 200 OK statuses and response times under 100 ms.',
    technical: 'Direct HTTP probe dispatched into isolated container namespace with microsecond response timing.',
    tags: ['baseline']
  },

  // --- Statistics & Verification ---
  mann_whitney: {
    id: 'mann_whitney',
    title: 'Mann-Whitney statistical test',
    category: 'Statistics & Verification',
    simple: 'A scientific test proving whether a speedup is 100% genuine, or just lucky run-to-run variation.',
    why: 'Prevents accepting code changes that seemed faster once by pure accident.',
    goodHint: 'p-value under 0.05 means there is less than a 5% chance the win was luck.',
    technical: 'Non-parametric U test of the null hypothesis that two distributions are equal. Significance threshold: p < 0.05.',
    explain: (val) => `Statistical confidence p=${val}. ${val < 0.05 ? 'Proven statistically significant (not luck)!' : 'Difference could be normal run variation.'}`,
    tags: ['overview', 'optimize', 'reports']
  },
  bootstrap_ci: {
    id: 'bootstrap_ci',
    title: '95% bootstrap confidence interval',
    category: 'Statistics & Verification',
    simple: 'An honest bracket showing the probable true range of your speed, like an election poll margin of error.',
    why: 'Never trust a single test number; real speed lives within a realistic high-and-low band.',
    goodHint: 'A narrower bracket means your performance is consistent and predictable.',
    technical: 'Empirical resampling (B=1,000) yielding the 2.5th and 97.5th percentiles of the metric distribution.',
    tags: ['overview', 'reports']
  },
  wilson_interval: {
    id: 'wilson_interval',
    title: 'Wilson score confidence interval',
    category: 'Statistics & Verification',
    simple: 'A smart formula for win rates that stays humble when you only tested a strategy a few times.',
    why: 'Winning 1 out of 1 trial doesn’t mean a strategy is 100% infallible.',
    goodHint: 'As you run more experiments, this confidence band narrows down closer to the true win rate.',
    technical: 'Asymmetric binomial proportion confidence interval accounting for small sample sizes (n < 30).',
    tags: ['memory', 'reports']
  },
  cliffs_delta: {
    id: 'cliffs_delta',
    title: "Cliff's Delta (real-world impact size)",
    category: 'Statistics & Verification',
    simple: 'Measures how big the speedup actually is, not just that it was faster by a tiny fraction of a millisecond.',
    why: 'Helps engineers ignore tiny improvements and focus on massive, game-changing wins.',
    goodHint: 'Values above 0.474 count as a large, noticeable real-world speed improvement.',
    technical: 'Non-parametric effect size metric quantifying the degree of dominance between two distributions (-1 to +1).',
    tags: ['overview', 'optimize']
  },

  // --- Static Analysis & Profiling ---
  anomaly_score: {
    id: 'anomaly_score',
    title: 'Telemetry anomaly score',
    category: 'Static Analysis & Profiling',
    simple: 'An AI detective score from 0 to 1 flagging routes that behave strangely compared to healthy endpoints.',
    why: 'Finds sneaky bottlenecks that pass unit tests but slow to a crawl under heavy load.',
    goodHint: 'Scores above 0.60 deserve top priority for performance investigation.',
    technical: 'Isolation Forest machine learning outlier score normalized between 0.0 (normal) and 1.0 (abnormal).',
    explain: (val) => `Anomaly score: ${val}. ${val > 0.6 ? 'High anomaly: this route shows unusual behavior under load.' : 'Normal runtime profile.'}`,
    tags: ['defects']
  },
  static_severity: {
    id: 'static_severity',
    title: 'Code rule severity rank',
    category: 'Static Analysis & Profiling',
    simple: 'A severity rating from 1 to 5 for architectural mistakes found by scanning the code without running it.',
    why: 'Warns you about known coding traps like queries inside loops before they hit production.',
    goodHint: 'Rank 4 and 5 defects should be fixed before shipping.',
    technical: 'AST and Semgrep rule ranking based on potential architectural damage and anti-patterns.',
    tags: ['defects']
  },
  profiler_hotness: {
    id: 'profiler_hotness',
    title: 'CPU profiler hotness share',
    category: 'Static Analysis & Profiling',
    simple: 'The percentage of the computer processor’s total time spent inside one specific function.',
    why: 'Points directly to the lines of code that are eating up your server electricity.',
    goodHint: 'Anything over 20% is a prime target for optimization.',
    technical: 'Sample count in target function divided by total execution samples harvested via V8 CPU profiling.',
    explain: (val) => `This function took up ${val}% of total CPU execution time during the test.`,
    tags: ['defects']
  },
  cyclomatic_complexity: {
    id: 'cyclomatic_complexity',
    title: 'Code path complexity',
    category: 'Static Analysis & Profiling',
    simple: 'The number of branches, loops, and decisions in a function, like intersections on a road.',
    why: 'Functions with lots of branches are hard to test, easy to break, and frequently hide performance bugs.',
    goodHint: 'Keep complexity under 10 for clean, maintainable code.',
    technical: 'McCabe cyclomatic complexity metric: M = E - N + 2P where E=edges, N=nodes, P=components.',
    explain: (val) => `Complexity score is ${val}. ${val > 10 ? 'High complexity: consider breaking this function into smaller pieces.' : 'Healthy and maintainable.'}`,
    tags: ['defects']
  },

  // --- AI Agents & Contextual Bandit Policy ---
  agent_loop: {
    id: 'agent_loop',
    title: 'Autonomous agent optimization loop',
    category: 'AI & Learning',
    simple: 'A team of AI agents that proposes a code fix, inspects it for safety, tests it in a sandbox, and verifies the speedup.',
    why: 'Automates performance tuning without risking untested or broken code entering your repository.',
    goodHint: 'Every single patch must pass automated tests and prove a speedup before being accepted.',
    technical: 'LangGraph state graph coordinating Analyzer, Patcher, Critic, and Validator agent nodes.',
    tags: ['optimize', 'reports']
  },
  critic_filter: {
    id: 'critic_filter',
    title: 'Critic agent safety review',
    category: 'AI & Learning',
    simple: 'An AI code reviewer that inspects proposed changes to catch shortcuts, cheats, or syntax errors.',
    why: 'Stops AI models from taking lazy shortcuts like deleting database lookups just to look fast.',
    goodHint: 'A strong critic catches 100% of deceptive or broken proposals.',
    technical: 'LLM-as-judge prompt evaluation checking semantic preservation, error handling, and TTL correctness.',
    tags: ['optimize']
  },
  reward_score: {
    id: 'reward_score',
    title: 'Optimization reward score (-1.0 to +1.0)',
    category: 'AI & Learning',
    simple: 'A score rating how good a fix was: points for speedups and capacity, heavy penalties for errors or memory bloat.',
    why: 'Teaches our AI learning engine what makes a healthy, long-term improvement.',
    goodHint: 'Positive scores above +0.30 indicate great patches; negative scores are regressions.',
    technical: 'Objective function: r = 0.6*(latGain) + 0.4*(rpsGain) - 0.8*(errPen) - 0.4*(memPen), bounded [-1, 1].',
    explain: (val) => {
      const n = typeof val === 'number' ? val.toFixed(2) : val;
      return `Reward score: ${n}. ${Number(n) > 0.3 ? 'Strong, healthy improvement!' : Number(n) < 0 ? 'Performance regressed.' : 'Small neutral change.'}`;
    },
    tags: ['memory', 'policy']
  },
  linucb: {
    id: 'linucb',
    title: 'LinUCB smart strategy selector',
    category: 'AI & Learning',
    simple: 'A machine learning algorithm that learns which fix works best for each problem, like a doctor choosing medicine based on symptoms.',
    why: 'Stops guessing blindly; picks caching for slow reads and batching for query loops based on past experience.',
    goodHint: 'Balances trying proven winners with testing fresh ideas in unknown areas.',
    technical: 'Contextual Linear Upper Confidence Bound: selects arm maximizing estimated reward plus uncertainty exploration bound.',
    tags: ['policy']
  },
  thompson_sampling: {
    id: 'thompson_sampling',
    title: 'Thompson sampling (exploration)',
    category: 'AI & Learning',
    simple: 'A learning method that balances sticking with what works versus exploring new ideas, like trying a new restaurant occasionally.',
    why: 'Keeps the optimizer from getting stuck in a rut while maintaining high overall win rates.',
    goodHint: 'Over time, it naturally focuses on strategies with the highest win track record.',
    technical: 'Bayesian algorithm maintaining posterior beta distributions over strategy win rates.',
    tags: ['policy']
  },
  action_masking: {
    id: 'action_masking',
    title: 'Action safety masking',
    category: 'AI & Learning',
    simple: 'Common-sense rules that forbid impossible actions, like adding database indexes to code that never talks to a database.',
    why: 'Saves your compute budget and prevents the AI from trying nonsensical fixes.',
    goodHint: 'Ensures 100% of attempted fixes are sensible candidates.',
    technical: 'Constraint filtering restricting candidate arm selection to syntactically and architecturally valid strategies.',
    tags: ['policy']
  },
  cumulative_regret: {
    id: 'cumulative_regret',
    title: 'Cumulative regret curve',
    category: 'AI & Learning',
    simple: 'Measures how quickly the AI learned from its mistakes. A curve that flattens out proves the AI is getting smarter.',
    why: 'The standard scientific proof that an AI optimization engine is truly learning rather than guessing randomly.',
    goodHint: 'A flattening curve shows the AI has mastered the codebase.',
    technical: 'Sum of differences between chosen arm rewards and optimal arm rewards over time: R(T) = sum(r* - r_t).',
    tags: ['policy']
  },
  failure_lessons: {
    id: 'failure_lessons',
    title: 'Negative lessons (failure memory)',
    category: 'AI & Learning',
    simple: 'Written notes remembered when an idea failed, like learning not to touch a hot stove twice.',
    why: 'The AI searches past mistakes so it never attempts the exact same bad fix again.',
    goodHint: 'Shared across all future runs so mistakes are only made once.',
    technical: 'Structured reflection stored in vector memory retrieved as negative few-shot examples for patch generation.',
    tags: ['memory']
  },
  vector_embeddings: {
    id: 'vector_embeddings',
    title: 'Vector memory & semantic search',
    category: 'AI & Learning',
    simple: 'A searchable memory bank that finds past code fixes with similar problems, even if written in different files.',
    why: 'Lets the AI recall how an N+1 query or slow hashing bottleneck was successfully solved in other projects.',
    goodHint: 'High similarity scores mean we have a tested precedent ready to adapt.',
    technical: 'Dense vector embeddings stored in Qdrant/in-memory store with cosine similarity matching.',
    tags: ['memory']
  },

  // --- Optimization Strategies ---
  strategy_batch: {
    id: 'strategy_batch',
    title: 'Batching strategy',
    category: 'Optimization Strategies',
    simple: 'Combines multiple separate database calls into one grouped request, like sending one bus instead of 30 taxis.',
    why: 'Solves N+1 query loops and cuts 60% to 80% of database wait time.',
    goodHint: 'Best used when code runs a database lookup inside a loop.',
    technical: 'Replaces sequential single-record lookups with a single batched query (e.g., $in or multi-key lookup).',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_cache: {
    id: 'strategy_cache',
    title: 'In-memory caching strategy',
    category: 'Optimization Strategies',
    simple: 'Saves frequent answers in high-speed computer memory so the server doesn’t re-calculate or re-fetch them from the disk.',
    why: 'Gives repeated visitors instant answers in less than 5 milliseconds.',
    goodHint: 'Always set an expiration time (TTL) so memory never gets stale or overflows.',
    technical: 'Stores pre-computed results in fast in-memory key-value store with explicit time-to-live invalidation.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_async: {
    id: 'strategy_async',
    title: 'Asynchronous offloading strategy',
    category: 'Optimization Strategies',
    simple: 'Swaps blocking operations with non-blocking promises, like dropping mail in a mailbox instead of standing in line at the post office.',
    why: 'Instantly frees up Node.js so it can keep answering other visitors without stalling.',
    goodHint: 'Turns event loop delay from over 40 ms into under 5 ms.',
    technical: 'Replaces synchronous APIs (crypto.pbkdf2Sync, fs.readFileSync) with async promises or background threadpools.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_index: {
    id: 'strategy_index',
    title: 'Database indexing strategy',
    category: 'Optimization Strategies',
    simple: 'Adds a table of contents to your database collection so lookups jump straight to the record without reading every line.',
    why: 'Turns slow scans of 100,000 database rows into an instant single-record jump.',
    goodHint: 'Ideal for columns used in filter queries or sort operations.',
    technical: 'Creates B-tree or hashed index keys eliminating O(N) collection scans in favor of O(log N) index lookups.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_pagination: {
    id: 'strategy_pagination',
    title: 'Pagination & query limit strategy',
    category: 'Optimization Strategies',
    simple: 'Fetches records in manageable pages (like 20 at a time) rather than dumping thousands of records into computer memory.',
    why: 'Prevents out-of-memory crashes when database collections grow large.',
    goodHint: 'Always put a limit() on every database search.',
    technical: 'Enforces limit and offset/cursor pagination constraints on queries to bound memory allocations.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_pool: {
    id: 'strategy_pool',
    title: 'Connection pooling strategy',
    category: 'Optimization Strategies',
    simple: 'Keeps a fleet of open database connections ready to reuse, like rental bicycles waiting at a station.',
    why: 'Cuts out the repeated overhead of creating and tearing down network connections on every visit.',
    goodHint: 'Saves 20-50 ms on every database query under heavy traffic.',
    technical: 'Maintains warm TCP/TLS database sockets in a pooled pool avoiding connection handshake overhead.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },
  strategy_compression: {
    id: 'strategy_compression',
    title: 'HTTP payload compression (Gzip / Brotli)',
    category: 'Optimization Strategies',
    simple: 'Compresses web responses before sending them over the internet, like vacuum-sealing clothes for travel.',
    why: 'Cuts download data size by up to 70%, speeding up load times for users on mobile phones.',
    goodHint: 'Saves bandwidth with virtually zero CPU penalty.',
    technical: 'Applies Gzip or Brotli encoding to outbound response streams for payloads > 1KB.',
    tags: ['defects', 'optimize', 'memory', 'reports']
  },

  // --- Load Profiles & Security ---
  load_profile: {
    id: 'load_profile',
    title: 'Load testing profile',
    category: 'Load Profiles & Verification',
    simple: 'The simulated crowd pattern used to test your app: how many virtual visitors, for how long, and how fast they arrive.',
    why: 'Simulates real-world traffic patterns to uncover slowdowns before your customers encounter them.',
    goodHint: 'Standard Load (20 users, 30s) is best for everyday baseline evaluation.',
    technical: 'k6 load script configuration governing Virtual Users (VUs), ramp stages, and execution duration.',
    tags: ['upload', 'baseline']
  },
  stress_test: {
    id: 'stress_test',
    title: 'Stress test profile',
    category: 'Load Profiles & Verification',
    simple: 'Pushes traffic far beyond normal daily traffic (80+ users) to find the exact point where the server gives up.',
    why: 'Shows whether the app degrades gracefully or crashes catastrophically when overwhelmed.',
    goodHint: 'Apps should return polite "try again soon" notices rather than crashing.',
    technical: 'High-concurrency test profile designed to exceed normal capacity and inspect recovery behavior.',
    tags: ['upload', 'baseline']
  },
  spike_test: {
    id: 'spike_test',
    title: 'Traffic spike profile',
    category: 'Load Profiles & Verification',
    simple: 'Hits the server with an abrupt, violent surge of visitors (0 to 100 users in seconds), then returns to normal.',
    why: 'Simulates flash sales, viral social media posts, or breaking news events.',
    goodHint: 'The server should recover back to normal speeds within 5 seconds of the surge ending.',
    technical: 'Rapid-ramp load profile measuring burst absorption and cooldown latency recovery.',
    tags: ['upload', 'baseline']
  },
  soak_test: {
    id: 'soak_test',
    title: 'Soak / endurance test profile',
    category: 'Load Profiles & Verification',
    simple: 'Runs moderate traffic for a longer continuous period to catch slow leaks in memory or network sockets.',
    why: 'Catches sneaky bugs that only appear after days or weeks of uninterrupted uptime.',
    goodHint: 'Memory usage should stay flat throughout the entire test.',
    technical: 'Extended duration test profile monitoring memory stability and unclosed file/socket descriptors.',
    tags: ['upload', 'baseline']
  },
  sandbox_containment: {
    id: 'sandbox_containment',
    title: 'Isolated sandbox security boundary (cgroups v2)',
    category: 'Security & Containment',
    simple: 'A secure digital quarantine room running uploaded code with strict limits: 1 CPU, 512MB RAM, and zero internet access.',
    why: 'Protects the host server from malicious code, cryptocurrency miners, or runaway loops.',
    goodHint: 'Keeps testing safe, isolated, and 100% reproducible.',
    technical: 'Linux cgroups v2 container boundary enforcing non-root UID 1001, drop-all capabilities, and read-only filesystem.',
    tags: ['upload', 'settings', 'baseline']
  },
  executive_health: {
    id: 'executive_health',
    title: 'Executive health verdict',
    category: 'Reliability & Errors',
    simple: 'A single letter grade (A through F) combining speed, error rate, and memory health into an easy summary.',
    why: 'Gives managers and team leaders an immediate Go / No-Go signal for launch.',
    goodHint: 'Grade A or B is recommended before deploying to real customers.',
    technical: 'Weighted composite rating of p95 SLA (<200ms), availability (>99.9%), and event loop responsiveness.',
    explain: (val) => `Executive verdict: Grade ${val || 'Pending'}.`,
    tags: ['overview', 'baseline', 'reports']
  },

  // --- Verdicts & Decisions ---
  verdict_accepted: {
    id: 'verdict_accepted',
    title: 'Verdict: Accepted',
    category: 'Statistics & Verification',
    simple: 'The code change passed all functional tests, measurably improved speed, and passed scientific significance tests.',
    why: 'This fix is safe, fast, and proven to help users without regressions.',
    goodHint: 'Accepted fixes are automatically compounded into the final optimized project.',
    technical: 'Statistically significant improvement (p < 0.05) with guarded metrics (error rate, memory) non-regressing.',
    tags: ['optimize', 'reports']
  },
  verdict_rejected: {
    id: 'verdict_rejected',
    title: 'Verdict: Rejected',
    category: 'Statistics & Verification',
    simple: 'The proposed fix either broke functional tests, slowed down speed, or caused memory leaks.',
    why: 'The optimizer discarded this change and recorded a failure lesson so it never repeats this mistake.',
    goodHint: 'Rejections keep bad code out of your repository.',
    technical: 'Failed test suite, increased error rates, memory inflation > 50%, or slower tail latency.',
    tags: ['optimize', 'reports']
  },
  verdict_inconclusive: {
    id: 'verdict_inconclusive',
    title: 'Verdict: Inconclusive (Noise)',
    category: 'Statistics & Verification',
    simple: 'The speed difference was too small compared to normal run-to-run variation, so we cannot prove it is real.',
    why: 'Prevents changing code when we are not confident it actually makes anything better.',
    goodHint: 'Treated safely as neutral and excluded from learning models.',
    technical: 'Statistical difference p >= 0.05 under Mann-Whitney U test; observed change is within benchmark noise.',
    tags: ['optimize', 'reports']
  }
};

// Aliases mapping alternate or shorthand terms to canonical glossary keys
export const GLOSSARY_ALIASES: Record<string, string> = {
  // Latency shorthands
  latency_p50: 'p50',
  median_latency: 'p50',
  latency_p90: 'p90',
  latency_p95: 'p95',
  tail_latency: 'p95',
  latency_p99: 'p99',
  // Throughput shorthands
  rps: 'throughput',
  throughput_rps: 'throughput',
  requests_per_second: 'throughput',
  // Strategy shorthands
  batch: 'strategy_batch',
  cache: 'strategy_cache',
  async: 'strategy_async',
  index: 'strategy_index',
  pagination: 'strategy_pagination',
  pool: 'strategy_pool',
  compression: 'strategy_compression',
  // Resource shorthands
  lag: 'event_loop_lag',
  memory: 'heap_memory',
  heap_slope: 'heap_memory',
  memory_footprint: 'heap_memory',
  // Verdicts
  accepted: 'verdict_accepted',
  rejected: 'verdict_rejected',
  inconclusive: 'verdict_inconclusive'
};

/**
 * Resolves any term key or alias to its canonical GlossaryEntry
 */
export function getGlossaryEntry(termKey: string): GlossaryEntry | undefined {
  if (!termKey) return undefined;
  const normalized = termKey.toLowerCase().trim();
  if (GLOSSARY[normalized]) return GLOSSARY[normalized];
  const canonical = GLOSSARY_ALIASES[normalized];
  if (canonical && GLOSSARY[canonical]) return GLOSSARY[canonical];
  return undefined;
}
