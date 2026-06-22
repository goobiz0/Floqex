function getRootDomain(host) {
  const envRoot = undefined;
  if (envRoot) return envRoot;
  const h = host.split(":")[0].toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return "";
  const parts = h.split(".");
  if (parts.length >= 2) return parts.slice(-2).join(".");
  return "";
}

console.log(getRootDomain("dashboard.floqex.com"));
console.log(getRootDomain("accounts.floqex.com"));
console.log(getRootDomain("floqex.com"));
