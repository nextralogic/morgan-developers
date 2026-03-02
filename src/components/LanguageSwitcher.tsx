import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation("common");

  const resolved = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0] as AppLanguage;
  const activeLanguage = SUPPORTED_LANGUAGES.includes(resolved) ? resolved : "en";

  const handleLanguageChange = (lang: AppLanguage) => {
    if (lang === activeLanguage) return;
    void i18n.changeLanguage(lang);
  };

  return (
    <div
      className={cn("inline-flex items-center rounded-full border bg-background p-1", className)}
      role="group"
      aria-label={t("languageSwitcher.ariaLabel")}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = activeLanguage === lang;
        return (
          <button
            key={lang}
            type="button"
            lang={lang}
            onClick={() => handleLanguageChange(lang)}
            aria-pressed={isActive}
            aria-label={t("languageSwitcher.switchTo", {
              language: t(`languageSwitcher.languages.${lang}` as const),
            })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`languageSwitcher.short.${lang}` as const)}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
