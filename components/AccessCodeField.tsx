"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function prefixFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)[0]
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase() || "NIMIO"
  );
}

function randomSuffix() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

export function AccessCodeField({
  nameInputId,
  memberName,
  fieldName = "access_code"
}: {
  nameInputId?: string;
  memberName?: string;
  fieldName?: string;
}) {
  const [code, setCode] = useState("");

  function generate() {
    const input = nameInputId ? document.getElementById(nameInputId) : null;
    const source = input instanceof HTMLInputElement ? input.value : memberName || "NIMIO";
    setCode(`${prefixFromName(source)}-${randomSuffix()}`);
  }

  useEffect(() => {
    generate();
    // Generate once on mount; button handles later updates from the name field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="label">
      Codigo de acceso generado
      <div className="flex gap-2">
        <input
          className="field font-mono tracking-[0.12em]"
          name={fieldName}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          required
        />
        <button className="btn btn-secondary" type="button" onClick={generate} title="Generar otro codigo">
          <RefreshCw size={16} />
        </button>
      </div>
      <span className="text-xs text-steel">Copialo antes de guardar. Despues solo se conserva el hash seguro.</span>
    </label>
  );
}
