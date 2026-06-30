"use client";

import React from "react";
import { formatUSD } from "@/lib/utils";
import { cn } from "@/lib/utils";

type DisplayValueProps = {
  money: number;
  percent?: number;
  className?: string;
  type?: "PNL" | "BALANCE";
  compact?: boolean;
};

export function DisplayValue({ money, percent, className, type = "PNL", compact }: DisplayValueProps) {
  const moneyStr = formatUSD(money, { sign: type === "PNL", compact });
  
  let percentStr = "";
  if (type === "PNL") {
    if (percent !== undefined && percent !== null) {
      percentStr = `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
    } else {
      percentStr = moneyStr; // Fallback if no percent available
    }
  } else {
    percentStr = moneyStr; // Balances cannot be percentages, stay as money
  }

  return (
    <span 
      className={cn("display-value-wrapper", className)} 
      data-percent={percentStr}
    >
      <span className="display-value-money">{moneyStr}</span>
    </span>
  );
}
