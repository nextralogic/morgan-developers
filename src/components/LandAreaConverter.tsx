import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREA_UNITS, sqftToNepali, sqftToTerai, type AreaUnit } from "@/lib/area-utils";
import { formatConverted } from "@/lib/land-conversions";

const RESULT_UNITS: AreaUnit[] = ["ropani", "aana", "paisa", "daam", "bigha", "kattha", "dhur", "sq_feet", "sq_meter", "acres"];

interface LandAreaConverterProps {
  initialUnit?: AreaUnit;
  /** When set, the result in this unit is shown above the full list. */
  target?: AreaUnit;
}

const LandAreaConverter = ({ initialUnit = "ropani", target }: LandAreaConverterProps) => {
  const { t, i18n } = useTranslation(["tools", "common"]);
  const numberLocale = i18n.resolvedLanguage?.startsWith("ne") ? "ne-NP" : "en-US";
  const [value, setValue] = useState("1");
  const [unit, setUnit] = useState<AreaUnit>(initialUnit);

  const format = (n: number, maxDigits = 2) => n.toLocaleString(numberLocale, { maximumFractionDigits: maxDigits });
  const unitLabel = (u: AreaUnit) => t(`areaUnits.${u}` as const, { ns: "common" });
  const unitName = (u: AreaUnit, count: number) => t(`landConverter.units.${u}.name` as const, { count });

  const amount = Number(value);
  const sqft = value.trim() !== "" && Number.isFinite(amount) && amount > 0 ? amount * AREA_UNITS[unit].toSqft : null;

  const hill = useMemo(() => (sqft ? sqftToNepali(sqft) : null), [sqft]);
  const terai = useMemo(() => (sqft ? sqftToTerai(sqft) : null), [sqft]);
  const targetValue = sqft && target ? sqft / AREA_UNITS[target].toSqft : null;

  return (
    <Card className="mt-8 rounded-xl">
      <CardContent className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="converter-value">{t("landConverter.valueLabel")}</Label>
            <Input
              id="converter-value"
              className="mt-1.5"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="converter-unit">{t("landConverter.unitLabel")}</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as AreaUnit)}>
              <SelectTrigger id="converter-unit" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{unitLabel(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <h2 className="mt-8 font-heading text-lg font-semibold">{t("landConverter.resultsTitle")}</h2>
        {sqft === null ? (
          <p className="mt-3 text-sm text-destructive" role="status">{t("landConverter.invalid")}</p>
        ) : (
          <div aria-live="polite">
            {target && targetValue !== null && (
              <p className="mt-4 rounded-lg bg-primary/10 p-4 font-heading text-lg font-semibold">
                {t("landConverter.pair.equation", {
                  amount: formatConverted(amount, numberLocale),
                  from: unitName(unit, amount),
                  value: formatConverted(targetValue, numberLocale),
                  to: unitName(target, targetValue),
                })}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {RESULT_UNITS.map((u) => (
                <div key={u} className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-xs text-muted-foreground">{unitLabel(u)}</dt>
                  <dd className="mt-1 font-heading text-base font-semibold">{format(sqft / AREA_UNITS[u].toSqft, 4)}</dd>
                </div>
              ))}
            </dl>
            {hill && terai && (
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("landConverter.hillBreakdown")}</dt>
                  <dd className="mt-1 font-heading font-semibold">
                    {[hill.ropani, hill.anna, hill.paisa, hill.dam].map((n) => format(n, 0)).join("-")}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{t("landConverter.teraiBreakdown")}</dt>
                  <dd className="mt-1 font-heading font-semibold">
                    {[format(terai.bigha, 0), format(terai.kattha, 0), format(terai.dhur)].join("-")}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LandAreaConverter;
