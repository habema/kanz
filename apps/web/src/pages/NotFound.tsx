import { Link } from 'wouter';

export function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center p-6 text-center">
      <div>
        <p className="tabular-nums text-5xl font-bold text-[#f2c75d]">٤٠٤</p>
        <h1 className="mt-3 text-xl font-black">الصفحة غير موجودة</h1>
        <Link href="/" className="mt-5 inline-block text-sm font-bold text-[#53cec4] hover:text-white">
          العودة إلى الشاشة الرئيسية
        </Link>
      </div>
    </main>
  );
}
