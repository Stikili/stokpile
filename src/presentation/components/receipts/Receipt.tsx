import type { ReceiptModel } from '@/domain/receipt';
import { money } from '@/lib/money';

/**
 * Receipt — the trust artefact. Mono throughout, dotted leaders bind key to
 * value, a penalty cites its constitution clause, and the stamp sits in its
 * own row so it never covers a figure.
 */
export function Receipt({ model }: { model: ReceiptModel }) {
  const recorded = model.recordedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="receipt">
      <div className="receipt__head">
        <div className="receipt__title">Stokpile · Receipt</div>
        <div className="receipt__ref">{model.ref}</div>
      </div>

      <Row k="Group" v={model.groupName} />
      <Row k="Member" v={model.memberName} />
      <Row k="Period" v={model.period} />
      {model.method && <Row k="Method" v={model.method} />}
      {model.capturedBy && <Row k="Captured by" v={model.capturedBy} />}
      {model.lines.map((l) => (
        <Row key={l.label} k={l.clause ? `${l.label} ${l.clause}` : l.label} v={money(l.amount, { decimals: true })} />
      ))}

      <div className="receipt__total">
        <span className="receipt__key">Total</span>
        <span className="receipt__val">{money(model.total, { decimals: true })}</span>
      </div>

      <div className="receipt__stamprow">
        <span className="receipt__stamp">Recorded</span>
      </div>

      <div className="receipt__row">
        <span className="receipt__key receipt__key--fine">{recorded}</span>
        <span className="ledger-row__leader" />
        <span className="receipt__key receipt__key--fine">Paid {model.paidCount}/{model.memberCount}</span>
      </div>

      <div className="receipt__perf" aria-hidden="true" />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="receipt__row">
      <span className="receipt__key">{k}</span>
      <span className="ledger-row__leader" />
      <span className="receipt__val">{v}</span>
    </div>
  );
}
