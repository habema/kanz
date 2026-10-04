import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAccessQueryKey, useCreatePassword, useGetAccess, useLogin, type ApiError } from '@kanz/api-client-react';
import { ErrorLine, Loading, ServerError, goldButton, input } from '@/components/ui';

// Shows children once the page's admin-only query has data; a 401 asks for
// the password instead.
export function AdminGate({
  query,
  children,
}: {
  query: { data?: unknown; error: ApiError | null; isLoading: boolean; refetch: () => unknown };
  children?: ReactNode;
}) {
  const access = useGetAccess();
  if (query.isLoading) return <Loading />;
  const signedOut = query.error?.status === 401;
  if (query.data !== undefined && !signedOut) return children;
  if (!signedOut || access.isError) return <ServerError />;
  if (!access.data) return <Loading />;
  const create = !access.data.hasPassword;
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <div className="panel-bevel p-6 sm:p-9">
        <h1 className="text-2xl font-black">{create ? 'أنشئ كلمة مرور الإدارة' : 'الدخول بكلمة مرور الإدارة'}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-55">{create ? PASSWORD_HINT : 'أدخل كلمة المرور للمتابعة.'}</p>
        <PasswordForm create={create} onDone={() => void query.refetch()} />
      </div>
    </main>
  );
}

export const PASSWORD_HINT = 'تحمي صفحات الإعداد والإدارة والمقدم. ٦ أحرف على الأقل.';

// Creates the admin password (first run) or signs in with it.
export function PasswordForm({ create, onDone }: { create: boolean; onDone: () => void }) {
  const client = useQueryClient();
  const [password, setPassword] = useState('');
  const done = () => {
    setPassword('');
    void client.invalidateQueries({ queryKey: getGetAccessQueryKey() });
    onDone();
  };
  const createPassword = useCreatePassword({ mutation: { onSuccess: done } });
  const login = useLogin({ mutation: { onSuccess: done } });
  const failed = create ? createPassword.error : login.error;
  const message =
    failed?.status === 401
      ? 'كلمة المرور غير صحيحة.'
      : failed?.status === 429
        ? 'محاولات كثيرة خاطئة. حاول بعد ربع ساعة.'
        : create
          ? 'تعذّر إنشاء كلمة المرور. أعد تحميل الصفحة.'
          : 'تعذّر الاتصال بالخادم.';
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        (create ? createPassword : login).mutate({ data: { password } });
      }}
    >
      {/* Lets password managers file the password under a name. */}
      <input
        type="text"
        name="username"
        value="admin"
        autoComplete="username"
        readOnly
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <label className="block text-sm font-bold" htmlFor="admin-password">
        كلمة المرور
      </label>
      <input
        id="admin-password"
        data-testid="input-password"
        type="password"
        autoComplete={create ? 'new-password' : 'current-password'}
        minLength={6}
        maxLength={64}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={`${input} w-full py-3 text-base`}
        dir="ltr"
      />
      <button
        data-testid="button-password-submit"
        disabled={createPassword.isPending || login.isPending}
        className={`${goldButton} w-full px-5 py-3`}
      >
        {create ? 'إنشاء كلمة المرور والمتابعة' : 'الدخول'}
      </button>
      {failed && <ErrorLine text={message} />}
    </form>
  );
}
