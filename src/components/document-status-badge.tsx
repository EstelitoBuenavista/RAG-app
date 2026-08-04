import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error'

const config: Record<
    DocumentStatus,
    { label: string; icon: typeof Clock; className: string; spin?: boolean }
> = {
    ready: {
        label: 'Ready',
        icon: CheckCircle2,
        className: 'border-success/30 bg-success/10 text-success',
    },
    processing: {
        label: 'Processing',
        icon: Loader2,
        className: 'border-warning/30 bg-warning/10 text-warning',
        spin: true,
    },
    pending: {
        label: 'Pending',
        icon: Clock,
        className: 'border-border bg-muted text-muted-foreground',
    },
    error: {
        label: 'Failed',
        icon: AlertCircle,
        className: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
    const { label, icon: Icon, className, spin } = config[status] ?? config.pending

    return (
        <Badge variant="outline" className={cn('gap-1.5', className)}>
            <Icon className={cn('size-3', spin && 'animate-spin')} />
            {label}
        </Badge>
    )
}
