import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { validateAuthForm } from "../lib/validation";

export default function AuthPage() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [pending, setPending] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const redirect = params.get("redirect") || "/";

  function switchMode(next) {
    setMode(next);
    setError("");
    setFieldErrors({});
  }

  function validateField(field) {
    const errors = validateAuthForm(mode, { name, email, password });
    if (errors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const errors = validateAuthForm(mode, { name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setPending(true);
    try {
      if (mode === "register") {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate(redirect);
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <Link to="/" className="authLogo">
          <img src="/Lypovoi.svg" alt="Липовой" />
        </Link>
        <div className="authTabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => switchMode("login")}>
            Вход
          </button>
          <button type="button" className={mode === "register" ? "on" : ""} onClick={() => switchMode("register")}>
            Регистрация
          </button>
        </div>
        <form className="authForm" onSubmit={submit} noValidate>
          {mode === "register" && (
            <label className={fieldErrors.name ? "inputInvalid" : ""}>
              Имя
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => validateField("name")}
                autoComplete="name"
              />
              {fieldErrors.name && <span className="fieldError">{fieldErrors.name}</span>}
            </label>
          )}
          <label className={fieldErrors.email ? "inputInvalid" : ""}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateField("email")}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="fieldError">{fieldErrors.email}</span>}
          </label>
          <label className={fieldErrors.password ? "inputInvalid" : ""}>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => validateField("password")}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            {fieldErrors.password && <span className="fieldError">{fieldErrors.password}</span>}
          </label>
          {error && <p className="authError">{error}</p>}
          <button type="submit" className="authSubmit" disabled={pending}>
            {pending ? "Подождите…" : mode === "register" ? "Создать аккаунт" : "Войти"}
          </button>
        </form>
        <p className="authHint">
          {mode === "login" ? (
            <>Нет аккаунта? <button type="button" onClick={() => switchMode("register")}>Зарегистрироваться</button></>
          ) : (
            <>Уже есть аккаунт? <button type="button" onClick={() => switchMode("login")}>Войти</button></>
          )}
        </p>
      </div>
    </main>
  );
}
