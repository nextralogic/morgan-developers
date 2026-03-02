import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Navbar = () => {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const { user, isModerator, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navLinks = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.properties"), to: "/properties" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between lg:h-18">
        <Link to="/" className="font-heading text-xl font-bold tracking-tight lg:text-2xl">
          {t("brand.name")}<span className="text-primary">.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative text-sm font-medium transition-colors hover:text-foreground",
                isActive(link.to)
                  ? "text-foreground after:absolute after:-bottom-[1.19rem] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:content-['']"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full px-4">
                  <User className="h-4 w-4" />
                  <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/my-properties")}>
                  {t("nav.myProperties")}
                </DropdownMenuItem>
                {isModerator && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    {t("nav.adminDashboard")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">{t("nav.signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to="/signup">{t("nav.signUp")}</Link>
              </Button>
            </div>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="shrink-0" />

          {/* Mobile nav */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">{t("nav.navigation")}</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                      isActive(link.to)
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

                {user ? (
                  <>
                    <Link
                      to="/my-properties"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                        isActive("/my-properties")
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {t("nav.myProperties")}
                    </Link>
                    {isModerator && (
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className={cn(
                          "rounded-lg px-3 py-2.5 text-base font-medium transition-colors",
                          isActive("/admin")
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {t("nav.adminDashboard")}
                      </Link>
                    )}
                    <div className="mt-4 border-t pt-4">
                      <Button variant="outline" className="w-full" onClick={() => { handleSignOut(); setOpen(false); }}>
                        <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/login" onClick={() => setOpen(false)}>{t("nav.signIn")}</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/signup" onClick={() => setOpen(false)}>{t("nav.signUp")}</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
