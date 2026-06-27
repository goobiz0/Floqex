const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/mochi-chat.tsx', 'utf8');

code = code.replace(/import \{ DefaultChatTransport, isToolUIPart, getToolName \} from "ai";\n/g, "");
code = code.replace(/transport: new DefaultChatTransport\(\{ api: "\/api\/chat" \}\),/g, 'api: "/api/chat",');
code = code.replace(/sendMessage/g, 'append');
code = code.replace(/addToolResult\(\{ tool: "[^"]+", toolCallId, output: ([^ ]+) \}\)/g, 'addToolResult({ toolCallId, result: $1 })');
code = code.replace(/addToolResult\(\{ tool: "[^"]+", toolCallId, output: \{ ok: false, message: "([^"]+)" \} \}\)/g, 'addToolResult({ toolCallId, result: { ok: false, message: "$1" } })');

// Rewrite the message rendering part
const oldRender = `                        {m.parts.map((part, i) => {
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
                              const out = part.result as { ok: boolean; message?: string };
                              return (
                                <div key={part.toolCallId} className={cn("mt-3 rounded-[12px] border p-3 text-[12px]", out.ok ? "border-profit/20 bg-profit/5" : "border-negative/20 bg-negative/5")}>
                                  <p className={cn("font-semibold flex items-center gap-1.5", out.ok ? "text-profit" : "text-negative")}>
                                    {out.ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                                    {out.ok ? "Changes Applied" : "Declined or Failed"}
                                  </p>
                                  {!out.ok && out.message && <p className="mt-1 text-fg-subtle text-[11px]">{out.message}</p>}
                                </div>
                              );
                            }
                          }
                          
                          if (toolName === "runMonteCarlo") {
                            if (isResult) {
                              const res = part.result as { ok: boolean; winRate?: number; expectation?: number; maxDrawdown?: number; samplePaths?: number[][] };
                              return (
                                <div key={part.toolCallId} className="mt-3 rounded-[12px] border border-line bg-surface p-3">
                                  {res.ok ? (
                                    <>
                                      <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                                        <p className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                                          <Check size={14} className="text-profit" weight="bold" /> Simulation Complete
                                        </p>
                                        <p className="text-[10px] text-fg-muted uppercase tracking-wider">10k runs</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div><span className="text-fg-subtle">Win Rate:</span> <span className="font-medium text-fg">{(res.winRate! * 100).toFixed(1)}%</span></div>
                                        <div><span className="text-fg-subtle">Expectancy:</span> <span className="font-medium text-fg">{res.expectation?.toFixed(3)}R</span></div>
                                        <div><span className="text-fg-subtle">Max DD:</span> <span className="font-medium text-negative">{(res.maxDrawdown! * 100).toFixed(1)}%</span></div>
                                      </div>
                                      {res.samplePaths && res.samplePaths[0] && <MonteCarloChart path={res.samplePaths[0]} />}
                                    </>
                                  ) : (
                                    <p className="text-[12px] text-negative font-medium">Simulation failed to run.</p>
                                  )}
                                </div>
                              );
                            }
                          }

                          return null;
                        })}`;

const newRender = `                        {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                        {m.toolInvocations?.map((toolInvocation) => {
                          const toolCallId = toolInvocation.toolCallId;
                          if (toolInvocation.toolName === "updateStrategyParams") {
                            if (!('result' in toolInvocation)) {
                              const args = toolInvocation.args;
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
                              const out = toolInvocation.result as { ok: boolean; message?: string };
                              return (
                                <div key={toolCallId} className={cn("mt-3 rounded-[12px] border p-3 text-[12px]", out.ok ? "border-profit/20 bg-profit/5" : "border-negative/20 bg-negative/5")}>
                                  <p className={cn("font-semibold flex items-center gap-1.5", out.ok ? "text-profit" : "text-negative")}>
                                    {out.ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                                    {out.ok ? "Changes Applied" : "Declined or Failed"}
                                  </p>
                                  {!out.ok && out.message && <p className="mt-1 text-fg-subtle text-[11px]">{out.message}</p>}
                                </div>
                              );
                            }
                          }
                          
                          if (toolInvocation.toolName === "runMonteCarlo") {
                            if ('result' in toolInvocation) {
                              const res = toolInvocation.result as { ok: boolean; winRate?: number; expectation?: number; maxDrawdown?: number; samplePaths?: number[][] };
                              return (
                                <div key={toolCallId} className="mt-3 rounded-[12px] border border-line bg-surface p-3">
                                  {res.ok ? (
                                    <>
                                      <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
                                        <p className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                                          <Check size={14} className="text-profit" weight="bold" /> Simulation Complete
                                        </p>
                                        <p className="text-[10px] text-fg-muted uppercase tracking-wider">10k runs</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div><span className="text-fg-subtle">Win Rate:</span> <span className="font-medium text-fg">{(res.winRate! * 100).toFixed(1)}%</span></div>
                                        <div><span className="text-fg-subtle">Expectancy:</span> <span className="font-medium text-fg">{res.expectation?.toFixed(3)}R</span></div>
                                        <div><span className="text-fg-subtle">Max DD:</span> <span className="font-medium text-negative">{(res.maxDrawdown! * 100).toFixed(1)}%</span></div>
                                      </div>
                                      {res.samplePaths && res.samplePaths[0] && <MonteCarloChart path={res.samplePaths[0]} />}
                                    </>
                                  ) : (
                                    <p className="text-[12px] text-negative font-medium">Simulation failed to run.</p>
                                  )}
                                </div>
                              );
                            }
                          }

                          return null;
                        })}`;

code = code.replace(oldRender, newRender);

fs.writeFileSync('src/components/dashboard/mochi-chat.tsx', code);
