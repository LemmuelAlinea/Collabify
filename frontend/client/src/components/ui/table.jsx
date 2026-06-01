import { cn } from '../../lib/utils/cn'

export const Table = ({ className, ...props }) => <table className={cn('ui-table', className)} {...props} />
export const TableHeader = ({ className, ...props }) => <thead className={cn('ui-table-header', className)} {...props} />
export const TableBody = ({ className, ...props }) => <tbody className={cn('ui-table-body', className)} {...props} />
export const TableRow = ({ className, ...props }) => <tr className={cn('ui-table-row', className)} {...props} />
export const TableHead = ({ className, ...props }) => <th className={cn('ui-table-head', className)} {...props} />
export const TableCell = ({ className, ...props }) => <td className={cn('ui-table-cell', className)} {...props} />
