import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

/** Typing pause before the search runs, so it does not fire on every keystroke. */
const SEARCH_DELAY_MS = 300;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder }: SearchBarProps) => {
  const { t } = useTranslation("properties");
  const [text, setText] = useState(value);
  // The last value sent out, so a change made elsewhere (such as clearing the filters) can be told apart.
  const sent = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    setText(value);
  }, [value]);

  useEffect(() => {
    if (text === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text;
      onChangeRef.current(text);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? t("search.placeholder")}
        className="h-11 rounded-xl pl-10"
      />
    </div>
  );
};

export default SearchBar;
