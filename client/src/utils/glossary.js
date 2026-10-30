/**
 * EVOLVE Technical Terminology & NFR Glossary Dictionary
 * Plain-language definitions, real-world business impacts, and target benchmarks
 * designed for developers, engineering managers, and product owners.
 */

export const GLOSSARY = {
  // --- Latency & User Speed ---
  latency_p50: {
    term: 'Median Latency (p50)',
    category: 'Latency & Speed',
    definition: 'The response time experienced by the 50th percentile (the middle user). Half of your users experience faster speeds, and half experience slower.',
    impact: 'Represents the typical day-to-day speed of your API under normal operating conditions.',
    target: '< 100 ms (Fast), < 250 ms (Acceptable)',
    analogy: 'If 100 customers order coffee, p50 is the wait time of customer #50 in line.'
  },
  latency_p90: {
    term: '90th Percentile Latency (p90)',
    category: 'Latency & Speed',
    definition: 'The response time boundary that 90% of requests beat. Only 10% of requests are slower than this number.',
    impact: 'Reveals early performance degradation before it affects the general user base.',
    target: '< 200 ms for interactive web APIs',
    analogy: 'The wait time for the slower 10% of customers when a complex order is being prepared.'
  },
  latency_p95: {
    term: 'Tail Latency (p95)',
    category: 'Latency & Speed',
    definition: 'The maximum latency experienced by 95% of users. The slowest 5% of requests take longer than this threshold.',
    impact: 'Critical SLA metric: High p95 directly causes customer churn, shopping cart abandonment, and perceived system unresponsiveness.',
    target: '< 200 ms (Strict SLA), < 500 ms (Tolerable)',
    analogy: 'The slowest 5 out of 100 customers who experience delays due to database locks or cache misses.'
  },
  latency_p99: {
    term: 'Worst-Case Tail Latency (p99)',
    category: 'Latency & Speed',
    definition: 'The latency boundary separating the top 99% of requests from the worst 1% outlier requests.',
    impact: 'Detects severe resource starvation, garbage collection pauses, or database connection pooling bottlenecks.',
    target: '< 1,000 ms under maximum peak load',
    analogy: 'The 1 in 100 customer who hits a complete system freeze or complex background query.'
  },

  // --- Throughput & Capacity ---
  throughput: {
    term: 'Throughput (RPS)',
    category: 'Throughput & Capacity',
    definition: 'Requests Per Second (RPS) — the volume of completed HTTP transactions your application server processes each second.',
    impact: 'Measures your infrastructure scale. If incoming user traffic exceeds this rate, requests queue up and eventually fail.',
    target: '50-100 RPS per CPU core for typical Node.js I/O workloads',
    analogy: 'The number of cars that can pass through a highway tollbooth every second.'
  },
  peak_capacity: {
    term: 'Peak Surge Capacity',
    category: 'Throughput & Capacity',
    definition: 'The absolute maximum throughput your service handled during brief traffic spikes without dropping socket connections.',
    impact: 'Dictates whether your service survives viral marketing events, flash sales, or morning traffic surges.',
    target: '> 1.35x of steady state throughput',
    analogy: 'The maximum traffic an emergency room can handle during a sudden crisis.'
  },
  steady_traffic: {
    term: 'Safe Steady Traffic',
    category: 'Throughput & Capacity',
    definition: 'The sustainable throughput where latency remains comfortably low and the event loop exhibits zero backlog.',
    impact: 'Your baseline capacity for everyday steady-state operation without risking downtime or memory leaks.',
    target: 'Maintains sub-100ms response times for 95% of requests',
    analogy: 'The cruising speed of an airplane where fuel economy and passenger comfort are optimal.'
  },
  breaking_point: {
    term: 'Breaking Point (Saturation VUs)',
    category: 'Throughput & Capacity',
    definition: 'The number of simultaneous Virtual Users (VUs) where the system begins rejecting requests or latency degrades exponentially.',
    impact: 'Tells engineering leaders exactly when the application will crash if user concurrency grows.',
    target: 'Should be at least 2x expected peak concurrent users',
    analogy: 'The bridge weight limit where structural stress begins causing visible cracks.'
  },
  concurrency_limit: {
    term: 'Safe Concurrency Limit',
    category: 'Throughput & Capacity',
    definition: 'Recommended maximum simultaneous active user sessions allowed to preserve strict SLA compliance.',
    impact: 'Used to configure autoscaling thresholds, load balancer limits, and rate-limiting quotas.',
    target: '75% of the estimated breaking point',
    analogy: 'The maximum occupancy sign posted inside an elevator or restaurant.'
  },
  capacity_classification: {
    term: 'Capacity Classification',
    category: 'Throughput & Capacity',
    definition: 'An automated grading (High Throughput, Medium Load, Bottlenecked) reflecting how efficiently the app converts CPU to completed requests.',
    impact: 'Provides non-technical stakeholders with a clear health verdict of production readiness.',
    target: 'High Throughput (> 250 RPS) or Medium Load (> 80 RPS)',
    analogy: 'An energy-efficiency rating label on consumer appliances.'
  },

  // --- System Health & Resources ---
  event_loop_lag: {
    term: 'Event Loop Lag',
    category: 'Resource & Stability',
    definition: 'The delay between when a scheduled Node.js task was ready to execute and when the single-threaded event loop actually processed it.',
    impact: 'Node.js is single-threaded. Any synchronous operation (JSON.parse of large files, crypto.pbkdf2Sync, CPU-heavy loops) blocks ALL users simultaneously!',
    target: '< 15 ms (Healthy), > 50 ms (Severe Bottleneck)',
    analogy: 'A single cashier at a supermarket who stops ringing items to recount the entire vault while 50 customers wait.'
  },
  heap_memory: {
    term: 'Memory Footprint & Heap Slope',
    category: 'Resource & Stability',
    definition: 'The RAM consumed by Javascript objects. The heap slope measures whether memory continuously grows over time without recovering.',
    impact: 'An upward heap slope indicates an unbounded memory leak (e.g., global arrays) that will eventually trigger an Out-of-Memory (OOM) crash.',
    target: '< 150 MB for typical microservices; stable horizontal slope',
    analogy: 'A boat taking on water faster than the bilge pump can expel it.'
  },
  error_rate: {
    term: 'Error Rate',
    category: 'Reliability & Errors',
    definition: 'The percentage of total requests that resulted in HTTP 4xx (client error), 5xx (server error), or connection timeouts.',
    impact: 'Directly measures system reliability. Even a 1% error rate means thousands of broken checkout sessions or failed logins per day.',
    target: '< 0.1% (High 99.9% Availability SLA)',
    analogy: 'The percentage of delivered packages that arrive damaged or broken.'
  },
  nfr_scorecard: {
    term: 'Non-Functional Requirements (NFR) Scorecard',
    category: 'Reliability & Errors',
    definition: 'A multi-dimensional evaluation of system qualities: Latency SLA, Reliability/Availability, Event Loop Health, and Memory Stability.',
    impact: 'Unlike functional tests that check if a feature works for 1 user, NFRs guarantee the feature works for thousands of concurrent users.',
    target: 'Score >= 85/100 (Compliant)',
    analogy: 'The crash-test safety rating of an automobile.'
  },
  virtual_request: {
    term: 'Interactive Virtual Request',
    category: 'Reliability & Errors',
    definition: 'A real-time HTTP probe dispatched directly to the isolated sandbox container without leaving the dashboard.',
    impact: 'Allows developers to verify request/response payloads and measure single-request latency on any discovered route.',
    target: '200 OK with fast turnaround',
    analogy: 'Placing a test phone call to verify the line is active and clear.'
  },

  // --- Statistical Verification & Decision Rigor ---
  mann_whitney: {
    term: 'Mann-Whitney U Significance Test',
    category: 'Statistics & Verification',
    definition: 'A non-parametric statistical hypothesis test that verifies whether an observed performance improvement is real or just random run-to-run noise.',
    impact: 'Guarantees that EVOLVE never accepts a patch just because one benchmark run got lucky.',
    target: 'p-value < 0.05 (Statistically Significant)',
    analogy: 'A double-blind clinical trial proving a medicine works better than a placebo.'
  },
  bootstrap_ci: {
    term: '95% Bootstrap Confidence Interval',
    category: 'Statistics & Verification',
    definition: 'Calculated by resynthesizing 1,000 empirical distributions (B=1,000) from raw benchmark runs to establish true 95% statistical bounds.',
    impact: 'Replaces deceptive single-point averages with honest statistical error bounds [low, high].',
    target: 'Tight confidence bands indicating low variance',
    analogy: 'An election poll margin of error: "Candidate leads by 54% (+/- 2%)."'
  },
  wilson_interval: {
    term: 'Wilson Score Interval',
    category: 'Statistics & Verification',
    definition: 'An asymmetric confidence interval for binomial proportions (e.g., win rates), rigorously handling small sample sizes ($n < 30$).',
    impact: 'Prevents overconfidence when an optimization strategy has only been tested 2 or 3 times.',
    target: 'Confidence bounds widen honestly on low $n$',
    analogy: 'A movie with three 5-star ratings is not guaranteed to be the best film in history.'
  },
  cliffs_delta: {
    term: "Cliff's Delta (Effect Size)",
    category: 'Statistics & Verification',
    definition: 'A non-parametric measure of how much one distribution dominates another, ranging from -1.0 to +1.0.',
    impact: 'Distinguishes between a tiny, practically meaningless improvement and a substantial, game-changing optimization.',
    target: 'Delta > 0.474 (Large Practical Effect)',
    analogy: 'Measuring not just that one sprinter won, but by how many meters they beat the competition.'
  },

  // --- Static Analysis & Anomaly Detection ---
  anomaly_score: {
    term: 'Telemetry Anomaly Score',
    category: 'Static Analysis & Profiling',
    definition: 'A machine-learned score (0.0 to 1.0) flagging routes whose runtime telemetry deviates abnormally from standard baseline behavior.',
    impact: 'Pinpoints stealthy bottlenecks that slip past unit tests but spike under heavy concurrency.',
    target: 'Scores > 0.6 indicate prioritized investigation candidates',
    analogy: 'A bank fraud detection algorithm spotting unusual credit card spending patterns.'
  },
  static_severity: {
    term: 'Static Rule Severity',
    category: 'Static Analysis & Profiling',
    definition: 'The architectural severity score assigned by AST and Semgrep rules (e.g. N+1 query loops, missing pagination, sync crypto).',
    impact: 'Identifies known anti-patterns in the source code before load tests are even executed.',
    target: 'Level 1-5 (Rank 5 being critical architectural bugs)',
    analogy: 'A building safety inspector citing code violations before tenants move in.'
  },
  profiler_hotness: {
    term: 'CPU Profiler Hotness',
    category: 'Static Analysis & Profiling',
    definition: 'The proportion of total CPU execution time spent inside a specific function, harvested via V8 CPU sampling.',
    impact: 'Shows developers exactly which lines of code are eating the server CPU.',
    target: 'Hotness > 20% indicates a primary optimization target',
    analogy: 'The biggest electrical appliance responsible for 80% of your power bill.'
  },
  cyclomatic_complexity: {
    term: 'Cyclomatic Complexity',
    category: 'Static Analysis & Profiling',
    definition: 'The number of independent execution paths through a function (branches, loops, conditional switches).',
    impact: 'Functions with complexity > 10 are error-prone, difficult to test, and frequently harbor performance traps.',
    target: '< 10 per function (Maintainable)',
    analogy: 'The number of forks and intersections on a winding mountain road.'
  },

  // --- AI Agents & Contextual Bandit Policy ---
  agent_loop: {
    term: 'LangGraph Autonomous Agent Loop',
    category: 'AI & Learning',
    definition: 'A state machine coordinating AI agents: Patcher proposes code diffs, Critic inspects safety, and Sandbox validates execution.',
    impact: 'Replaces unstructured chat assistants with a rigorous, self-verifying engineering pipeline.',
    target: 'Zero unverified code accepted into the codebase',
    analogy: 'An engineering team where a junior proposes code, a senior reviews, and automated CI tests verify before merging.'
  },
  critic_filter: {
    term: 'Critic Agent Safety Review',
    category: 'AI & Learning',
    definition: 'An independent LLM agent that inspects proposed diffs for reward-hacking, missing cache TTLs, early returns, and syntax errors.',
    impact: 'Prevents AI models from taking lazy shortcuts (e.g. hardcoding an instant empty response to win a latency metric).',
    target: '100% rejection of deceptive or unhygienic diffs',
    analogy: 'A quality assurance inspector who catches shortcuts and defective parts on an assembly line.'
  },
  reward_score: {
    term: 'Mathematical Reward [-1.0, 1.0]',
    category: 'AI & Learning',
    definition: 'A balanced objective function rewarding latency reduction (+0.6) and throughput gain (+0.4) while heavily penalizing errors (-0.8) and memory inflation (-0.4).',
    impact: 'Teaches the contextual bandit policy what constitutes a healthy, sustainable optimization.',
    target: 'Reward > +0.3 for accepted patches; negative for regressions',
    analogy: 'A credit score calculating financial trustworthiness based on multiple indicators.'
  },
  linucb: {
    term: 'LinUCB (Linear Upper Confidence Bound)',
    category: 'AI & Learning',
    definition: 'A contextual bandit algorithm that estimates the expected reward of each strategy based on defect feature vectors (complexity, lag, db time).',
    impact: 'Learns which strategy (batching vs caching vs indexing) works best for each specific type of code bottleneck.',
    target: 'Converges to optimal strategies with minimal trial-and-error',
    analogy: 'A seasoned doctor choosing the most effective medication based on a patient symptoms and medical history.'
  },
  thompson_sampling: {
    term: 'Thompson Sampling',
    category: 'AI & Learning',
    definition: 'A Bayesian reinforcement learning algorithm that balances exploring uncertain strategies with exploiting proven winners.',
    impact: 'Avoids getting stuck in local optima while maintaining high average optimization success rates.',
    target: 'Gradually shifts exploration toward high-performing arms',
    analogy: 'A restaurant diner occasionally trying an unfamiliar menu item to discover new favorites.'
  },
  action_masking: {
    term: 'Action Masking',
    category: 'AI & Learning',
    definition: 'Mathematical constraints that forbid impossible or nonsensical strategies (e.g. adding database indexing to a function that performs no database queries).',
    impact: 'Prevents the AI agent from wasting optimization budget on useless or destructive attempts.',
    target: '100% physically valid strategy candidates',
    analogy: 'A car transmission preventing you from shifting into reverse while driving at 65 MPH.'
  },
  cumulative_regret: {
    term: 'Cumulative Regret',
    category: 'AI & Learning',
    definition: 'The difference between the reward achieved by the policy and the theoretical reward of always choosing the best possible action in hindsight.',
    impact: 'The standard academic metric measuring how quickly an AI agent learns. Sub-linear regret proves the policy is learning effectively.',
    target: 'Logarithmic growth curve flattening over time',
    analogy: 'The cost of mistakes made while learning a new skill.'
  },
  failure_lessons: {
    term: 'Negative Lessons (Failure Memory)',
    category: 'AI & Learning',
    definition: 'Structured post-mortem reflections generated when a patch fails functional tests or degrades tail latency.',
    impact: 'Stored in vector memory and retrieved in future attempts so the AI agent never repeats the same mistake twice.',
    target: 'Immediate avoidance of verified anti-patterns',
    analogy: 'Touching a hot stove and remembering not to touch it again.'
  },
  vector_embeddings: {
    term: 'Vector Store & Semantic Embeddings',
    category: 'AI & Learning',
    definition: '128-dimensional dense vector projections of AST code structures and features stored in Qdrant/memory.',
    impact: 'Enables instant nearest-neighbor similarity search to find how similar bottlenecks were solved in the past.',
    target: 'Cosine similarity > 0.85 indicates highly relevant past precedent',
    analogy: 'A digital library index that finds books with similar themes even if they use different words.'
  },

  // --- Optimization Strategies ---
  strategy_batch: {
    term: 'Batching Strategy',
    category: 'Optimization Strategies',
    definition: 'Combines multiple sequential database round-trips or I/O requests into a single grouped query (solves N+1 query loops).',
    impact: 'Typically yields 60-80% tail latency reduction on database-heavy endpoints.',
    target: 'Reduces N database calls to 1 batched query',
    analogy: 'Sending a single bus to carry 30 passengers instead of calling 30 separate taxis.'
  },
  strategy_cache: {
    term: 'Caching Strategy',
    category: 'Optimization Strategies',
    definition: 'Stores computed results or frequently read database entities in high-speed in-memory storage with explicit TTL invalidation.',
    impact: 'Bypasses slow disk and database queries for repeated read traffic.',
    target: '> 85% cache hit ratio with zero stale data leaks',
    analogy: 'Keeping your favorite recipes on the refrigerator door instead of searching the cookbook every time.'
  },
  strategy_async: {
    term: 'Asynchronous Offloading Strategy',
    category: 'Optimization Strategies',
    definition: 'Replaces blocking synchronous operations (e.g. crypto.pbkdf2Sync, fs.readFileSync) with non-blocking async promises or worker pools.',
    impact: 'Instantly eliminates event-loop lag, freeing Node.js to serve other concurrent user requests.',
    target: 'Event-loop lag drops from > 40ms to < 5ms',
    analogy: 'Dropping your mail in an outgoing mailbox rather than waiting in line at the post office.'
  },
  strategy_index: {
    term: 'Database Indexing Strategy',
    category: 'Optimization Strategies',
    definition: 'Adds indexed lookups on filtered or sorted database collection fields to eliminate full-table scans.',
    impact: 'Transforms $O(N)$ full database scans into $O(\log N)$ or $O(1)$ fast lookups.',
    target: 'Scan ratio drops from 10,000 scanned records to 1 matching index entry',
    analogy: 'Using the index at the back of a textbook instead of reading all 500 pages to find a term.'
  },
  strategy_pagination: {
    term: 'Pagination & Query Bounds',
    category: 'Optimization Strategies',
    definition: 'Enforces strict limit and offset constraints on database queries (e.g. find().limit(20)).',
    impact: 'Prevents unbounded queries from allocating massive arrays in memory, avoiding Out-Of-Memory crashes.',
    target: 'Caps response payload size to predictable bounds',
    analogy: 'Reading a book chapter by chapter rather than trying to swallow the entire book at once.'
  },
  strategy_pool: {
    term: 'Connection Pooling Strategy',
    category: 'Optimization Strategies',
    definition: 'Maintains a reusable pool of warm database and HTTP connections rather than opening and closing a TCP socket per request.',
    impact: 'Eliminates TCP and TLS handshake overhead, lowering p95 latency under heavy load.',
    target: 'Zero socket connection churn under continuous traffic',
    analogy: 'A fleet of rental bicycles ready at the station instead of buying a new bike for every commute.'
  },
  strategy_compression: {
    term: 'Payload Compression (Gzip / Brotli)',
    category: 'Optimization Strategies',
    definition: 'Compresses outbound HTTP response bodies before transmitting them over the network wire.',
    impact: 'Reduces bandwidth consumption by 60-80% and accelerates page load times for remote users.',
    target: 'Significant wire-size reduction with minimal CPU overhead',
    analogy: 'Vacuum-sealing winter blankets so they take up a fraction of the space in a closet.'
  }
};
