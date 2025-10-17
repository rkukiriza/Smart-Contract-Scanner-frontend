"use client"
import React from "react"

type Props = React.InputHTMLAttributes<HTMLInputElement> & { children?: React.ReactNode; id?: string }

export function Checkbox({ id, children, ...props }: Props) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input id={id} type="checkbox" className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500" {...props} />
      {children ? <span className="text-sm text-gray-200">{children}</span> : null}
    </label>
  )
}

export function CheckboxDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Checkbox id="terms">I agree to the terms</Checkbox>
      </div>
    </div>
  )
}
