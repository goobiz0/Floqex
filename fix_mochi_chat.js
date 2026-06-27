const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/mochi-chat.tsx', 'utf8');

code = code.replace(/import \{ DefaultChatTransport, isToolUIPart, getToolName \} from "ai";\n/g, "");
code = code.replace(/transport: new DefaultChatTransport\(\{ api: "\/api\/chat" \}\)/g, 'api: "/api/chat"');
code = code.replace(/sendMessage\(/g, "append({ role: 'user', content: ");
code = code.replace(/const \{ messages, sendMessage, status, addToolResult, setMessages, error \} = useChat/g, "const { messages, append, isLoading, addToolResult, setMessages, error } = useChat");
code = code.replace(/const isLoading = status === "submitted" \|\| status === "streaming";/g, ""); // removed
code = code.replace(/addToolResult\(\{ tool: "updateStrategyParams", toolCallId, output:/g, "addToolResult({ toolCallId, result:");

const blockOld = `                        {m.parts.map((part, i) => {
                          if (part.type === "text") {
                            return part.text ? (
                              <div key={\`\${m.id}-t\${i}\`} className="whitespace-pre-wrap">{part.text}</div>
                            ) : null;
                          }
                          if (!isToolUIPart(part)) return null;

                          const toolName = getToolName(part);
                          const isCall = part.state === "input-available";
                          const isResult = part.state === "output-available";

                          if (toolName === "updateStrategyParams") {
                            if (isCall) {
                              const args = (part.input ?? {}) as Record<string, unknown>;
                              const busy = pendingToolId === part.toolCallId;
                              return (
                                <div key={part.toolCallId} className="mt-3 overflow-hidden rounded-[12px] border border-accent/20 bg-accent-soft p-3">
                                  <p className="text-[12px] font-medium text-accent mb-2">Mochi proposes changes:</p>
                                  <pre className="text-[11px] text-accent/90 mb-3 bg-base/50 p-2 rounded overflow-x-auto">{JSON.stringify(args, null, 2)}</pre>
                                  <div className="flex gap-2">
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolAccept(part.toolCallId, args)}
                                      className="flex-1 rounded-[6px] bg-accent py-1.5 text-[11px] font-semibold text-[var(--color-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {busy ? "Applying…" : "Accept & Apply"}
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolDecline(part.toolCallId)}
                                      className="flex-1 rounded-[6px] border border-accent/30 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            if (isResult) {
                              const res = part.output as { ok?: boolean } | undefined;
                              const ok = res?.ok;
                              return (
                                <div key={part.toolCallId} className="mt-3 flex items-center gap-2 rounded-full border border-line bg-base px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-fg-muted">
                                  {ok ? <Check size={12} weight="bold" className="text-profit" /> : <X size={12} weight="bold" className="text-negative" />}
                                  {ok ? "Changes Applied" : "Changes Declined / Failed"}
                                </div>
                              );
                            }
                            return null;
                          }

                          if (toolName === "calculate" && isResult) {
                            const out = (part.output ?? {}) as { expression?: string; result?: number; error?: string };
                            return (
                                <div key={part.toolCallId} className="mt-3 rounded-[10px] border border-line bg-base px-3 py-2 font-mono text-[12px] text-fg">
                                  {out.error ? (
                                    <span className="text-negative">{out.error}</span>
                                  ) : (
                                    <span><span className="text-fg-subtle">{out.expression} =</span> <span className="font-semibold text-accent">{out.result}</span></span>
                                  )}
                                </div>
                            );
                          }

                          if (toolName === "runMonteCarlo" && isResult) {
                            const mc = (part.output ?? {}) as {
                              startingBalance?: number; trades?: number; simulations?: number;
                              p10?: number; p50?: number; p90?: number; ruinProbability?: number; samplePath?: number[];
                            };
                            const money = (n?: number) => \`$\${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}\`;
                            return (
                                <div key={part.toolCallId} className="mt-3 rounded-[12px] border border-line bg-base p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Monte Carlo · {mc.simulations} runs · {mc.trades} trades</p>
                                    <span className={cn("text-[11px] font-semibold", (mc.ruinProbability ?? 0) > 25 ? "text-negative" : "text-fg-muted")}>
                                      {mc.ruinProbability}% risk of 50% drawdown
                                    </span>
                                  </div>
                                  <MonteCarloChart path={mc.samplePath ?? []} />
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-fg-subtle">
                                    <div className="flex justify-between border-b border-line pb-1"><span>Worst 10%</span> <span className="font-semibold text-fg">{money(mc.p10)}</span></div>
                                    <div className="flex justify-between border-b border-line pb-1"><span>Median</span> <span className="font-semibold text-fg">{money(mc.p50)}</span></div>
                                    <div className="flex justify-between"><span>Top 10%</span> <span className="font-semibold text-fg">{money(mc.p90)}</span></div>
                                    <div className="flex justify-between"><span>Mean</span> <span className="font-semibold text-fg">{money(mc.mean)}</span></div>
                                  </div>
                                </div>
                            );
                          }

                          return null;
                        })}`;

const blockNew = `                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.toolInvocations?.map((toolInvocation) => {
                          const toolCallId = toolInvocation.toolCallId;
                          if (toolInvocation.toolName === "updateStrategyParams") {
                            if (!('result' in toolInvocation)) {
                              const args = toolInvocation.args as Record<string, unknown>;
                              const busy = pendingToolId === toolCallId;
                              return (
                                <div key={toolCallId} className="mt-3 overflow-hidden rounded-[12px] border border-accent/20 bg-accent-soft p-3">
                                  <p className="text-[12px] font-medium text-accent mb-2">Mochi proposes changes:</p>
                                  <pre className="text-[11px] text-accent/90 mb-3 bg-base/50 p-2 rounded overflow-x-auto">{JSON.stringify(args, null, 2)}</pre>
                                  <div className="flex gap-2">
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolAccept(toolCallId, args)}
                                      className="flex-1 rounded-[6px] bg-accent py-1.5 text-[11px] font-semibold text-[var(--color-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {busy ? "Applying…" : "Accept & Apply"}
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleToolDecline(toolCallId)}
                                      className="flex-1 rounded-[6px] border border-accent/30 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              );
                            } else {
                              const res = toolInvocation.result as { ok?: boolean } | undefined;
                              const ok = res?.ok;
                              return (
                                <div key={toolCallId} className="mt-3 flex items-center gap-2 rounded-full border border-line bg-base px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-fg-muted">
                                  {ok ? <Check size={12} weight="bold" className="text-profit" /> : <X size={12} weight="bold" className="text-negative" />}
                                  {ok ? "Changes Applied" : "Changes Declined / Failed"}
                                </div>
                              );
                            }
                          }
                          
                          if (toolInvocation.toolName === "calculate" && 'result' in toolInvocation) {
                            const out = (toolInvocation.result ?? {}) as { expression?: string; result?: number; error?: string };
                            return (
                              <div key={toolCallId} className="mt-3 rounded-[10px] border border-line bg-base px-3 py-2 font-mono text-[12px] text-fg">
                                {out.error ? (
                                  <span className="text-negative">{out.error}</span>
                                ) : (
                                  <span><span className="text-fg-subtle">{out.expression} =</span> <span className="font-semibold text-accent">{out.result}</span></span>
                                )}
                              </div>
                            );
                          }

                          if (toolInvocation.toolName === "runMonteCarlo" && 'result' in toolInvocation) {
                            const mc = (toolInvocation.result ?? {}) as {
                              startingBalance?: number; trades?: number; simulations?: number; mean?: number;
                              p10?: number; p50?: number; p90?: number; ruinProbability?: number; samplePath?: number[];
                            };
                            const money = (n?: number) => \`$\${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}\`;
                            return (
                                <div key={toolCallId} className="mt-3 rounded-[12px] border border-line bg-base p-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Monte Carlo · {mc.simulations} runs · {mc.trades} trades</p>
                                    <span className={cn("text-[11px] font-semibold", (mc.ruinProbability ?? 0) > 25 ? "text-negative" : "text-fg-muted")}>
                                      {mc.ruinProbability}% risk of 50% drawdown
                                    </span>
                                  </div>
                                  <MonteCarloChart path={mc.samplePath ?? []} />
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-fg-subtle">
                                    <div className="flex justify-between border-b border-line pb-1"><span>Worst 10%</span> <span className="font-semibold text-fg">{money(mc.p10)}</span></div>
                                    <div className="flex justify-between border-b border-line pb-1"><span>Median</span> <span className="font-semibold text-fg">{money(mc.p50)}</span></div>
                                    <div className="flex justify-between"><span>Top 10%</span> <span className="font-semibold text-fg">{money(mc.p90)}</span></div>
                                    <div className="flex justify-between"><span>Mean</span> <span className="font-semibold text-fg">{money(mc.mean)}</span></div>
                                  </div>
                                </div>
                            );
                          }

                          return null;
                        })}`;

code = code.replace(blockOld, blockNew);

fs.writeFileSync('src/components/dashboard/mochi-chat.tsx', code);
