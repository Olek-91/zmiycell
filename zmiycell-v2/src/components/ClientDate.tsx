"use client";

import { useState, useEffect } from 'react';

export function ClientDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("uk-UA"));
  }, []);
  return <span className="uppercase hidden sm:inline">{date}</span>;
}
