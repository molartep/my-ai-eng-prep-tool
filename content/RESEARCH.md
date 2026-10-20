# Research and provenance

Research completed during development on 2026-10-09 (America/Bogota date). See references.json for exact publisher, title, URL and retrieval date; metadata is imported into SQLite and rendered without a network dependency.

The primary reference repository was inspected through its README and curriculum structure at revision **b6a7a1706bae08c6b4e90f2d9dbfd997f8cbe126**, confirmed with `git ls-remote`. Path: README.md. Its relevant areas include LLM Engineering, Tools & Protocols, Agent Engineering, Autonomous Systems, Multi-Agent & Swarms, and Infrastructure & Production. Those areas informed the interview-oriented scope. No repository scripts or Skills were installed or executed, and no complete repository lessons were copied.

Primary documentation was opened and reviewed, including:

| Material | Application to the curriculum |
|---|---|
| Hugging Face LLM Course and text generation | Model/token context, inference, sampling and local-model trade-offs |
| Lewis et al., Retrieval-Augmented Generation | Separation of retrieval and generation |
| Liu et al., Lost in the Middle | Effective context use and position-sensitive failures |
| Microsoft Learn hybrid search | Lexical/vector retrieval and ranking fusion |
| Stanford Introduction to Information Retrieval, ranked evaluation | Precision, AP/MAP and NDCG definitions and examples |
| Ragas paper and LlamaIndex evaluation guide | Context support and stage-specific RAG evaluation |
| Anthropic, Building effective agents | Workflow/agent distinction, bounded autonomy and compositional patterns |
| OpenAI function calling and structured outputs | Model proposals versus runtime execution; schema compliance versus semantic validation |
| MCP architecture and security best practices, 2026-07-28 documentation | Host/client/server roles, primitives, transports and trust boundaries |
| Agent Skills specification | Instruction packaging, discovery and progressive disclosure |
| LangChain and LangGraph overview/persistence | Framework selection, graph state, reducers, persistence and interruptions |
| OpenAI and Google evaluation documentation | Versioned datasets, rubric evaluation, calibration and release checks |
| Ollama chat/tags API documentation | Optional local evaluation and installed model detection |

Explanations, diagnostic scenarios, numerical examples, rubrics and architecture choices are original synthesis. Source attribution means supporting background, not a claim that each source prescribes every proposed architecture or example. Source-specific behavior is framed conceptually; protocol version is identified explicitly. Pages can change after retrieval; no automatic update runs offline.

Scope: 99 concept articles plus 15 architectural designs, consolidating related named topics across all 12 requested categories. Three complementary exercises per concept test explanation, diagnosis and selection of an engineering response. Supplemental comparisons, multiple-select and true/false expose misconceptions. Designs include requirements, components, flow, decisions, trade-offs, failures, scaling, evaluation and follow-ups. Sources are not used to reproduce large copyrighted passages. All data is local JSON and SQLite.
