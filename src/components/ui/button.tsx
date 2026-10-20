import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,type VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
import {twMerge} from 'tailwind-merge';
export const cn=(...inputs:Parameters<typeof clsx>)=>twMerge(clsx(...inputs));
const variants=cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:pointer-events-none disabled:opacity-50',{variants:{variant:{default:'bg-lime-400 text-zinc-950 hover:bg-lime-300',secondary:'bg-white/5 text-inherit border border-[var(--border)] hover:bg-white/10',ghost:'text-inherit hover:bg-white/5',danger:'bg-red-500/10 text-red-400 border border-red-500/20'},size:{default:'h-10 px-4',sm:'h-8 px-3 text-xs',icon:'h-9 w-9'}},defaultVariants:{variant:'default',size:'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof variants>{asChild?:boolean}
export const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({className,variant,size,asChild=false,...props},ref)=>{const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant,size,className}))} ref={ref} {...props}/>;});Button.displayName='Button';
