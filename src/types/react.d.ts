import "react";

// React 18 passes the lowercase attribute through to the DOM but its types do not list it yet.
declare module "react" {
  interface ImgHTMLAttributes<T> {
    fetchpriority?: "high" | "low" | "auto";
  }
}
