"use client";

import { useState } from "react";

// แท็บสลับระหว่าง login เจ้าหน้าที่/ครู (SSO ผ่านระบบเช็คชื่อ — sso.ts) กับ
// นักเรียน (รหัสนักเรียน + รหัสผ่านที่ตั้งเอง หรือผูกบัญชีครั้งแรกด้วยรหัส
// ยืนยันที่แอดมิน/ครูออกให้ — studentAuth.ts) Server Actions ถูกส่งเข้ามา
// เป็น props จากหน้า server component ตรง ๆ

type Props = {
  ssoLoginAction: (formData: FormData) => void;
  studentLoginAction: (formData: FormData) => void;
  claimStudentAccountAction: (formData: FormData) => void;
  next: string;
  staffError?: string;
  staffMessage?: string;
  studentError?: string;
  studentCodePrefill?: string;
  defaultTab: "staff" | "student";
};

export function LoginTabs({
  ssoLoginAction,
  studentLoginAction,
  claimStudentAccountAction,
  next,
  staffError,
  staffMessage,
  studentError,
  studentCodePrefill,
  defaultTab,
}: Props) {
  const [tab, setTab] = useState<"staff" | "student">(defaultTab);
  const [studentMode, setStudentMode] = useState<"returning" | "claim">("returning");

  return (
    <div>
      <div className="mb-5 flex rounded-md border border-slate-200 p-1">
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "staff" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          เจ้าหน้าที่ / ครู
        </button>
        <button
          type="button"
          onClick={() => setTab("student")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "student" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          นักเรียน
        </button>
      </div>

      {tab === "staff" && (
        <div>
          <p className="text-sm text-slate-500">ใช้บัญชีเดียวกับระบบเช็คชื่อมาเรียน</p>

          {staffMessage && (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {staffMessage}
            </p>
          )}
          {staffError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{staffError}</p>
          )}

          <form action={ssoLoginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ลืมรหัสผ่าน หรือยังไม่มีบัญชี? ติดต่อแอดมินงานปกครอง/ฝ่ายเช็คชื่อ
          </p>
        </div>
      )}

      {tab === "student" && (
        <div>
          <p className="text-sm text-slate-500">
            {studentMode === "returning"
              ? "เข้าสู่ระบบด้วยรหัสนักเรียนและรหัสผ่านที่ตั้งไว้"
              : "ผูกบัญชีครั้งแรกด้วยรหัสยืนยันที่แอดมิน/ครูให้มา"}
          </p>

          {studentError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{studentError}</p>
          )}

          {studentMode === "returning" ? (
            <form action={studentLoginAction} className="mt-6 space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label className="block text-sm font-medium text-slate-700">รหัสนักเรียน</label>
                <input
                  name="studentCode"
                  type="text"
                  required
                  defaultValue={studentCodePrefill}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          ) : (
            <form action={claimStudentAccountAction} className="mt-6 space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label className="block text-sm font-medium text-slate-700">รหัสนักเรียน</label>
                <input
                  name="studentCode"
                  type="text"
                  required
                  defaultValue={studentCodePrefill}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">รหัสยืนยัน (จากแอดมิน/ครู)</label>
                <input
                  name="claimCode"
                  type="text"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase tracking-wider focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">ตั้งรหัสผ่านใหม่</label>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">ยืนยันรหัสผ่าน</label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                ผูกบัญชีและเข้าสู่ระบบ
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setStudentMode(studentMode === "returning" ? "claim" : "returning")}
            className="mt-4 w-full text-center text-sm text-indigo-600 hover:underline"
          >
            {studentMode === "returning"
              ? "ได้รับรหัสยืนยันจากแอดมิน/ครู? ผูกบัญชีที่นี่"
              : "มีรหัสผ่านแล้ว? เข้าสู่ระบบที่นี่"}
          </button>
        </div>
      )}
    </div>
  );
}
