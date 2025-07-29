interface SkeletonProps {
}

export function Skeleton({}: SkeletonProps) {
  return (
    <div />
  )
}

export function RFISkeleton() {
  return (
    <div>
      <div>
        <div>
          <div>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
          <Skeleton />
          <Skeleton />
          <div>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        </div>
        <div>
          <Skeleton />
        </div>
      </div>
    </div>
  )
}

export function RFIListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      <div>
        <Skeleton />
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <RFISkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function ResponseSkeleton() {
  return (
    <div>
      <Skeleton />
      <div>
        <div>
          <Skeleton />
          <Skeleton />
        </div>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  )
}

export function ResponseListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ResponseSkeleton key={i} />
      ))}
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div>
            <div>
              <Skeleton />
            </div>
            <div>
              <Skeleton />
              <Skeleton />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div>
      <div>
        <Skeleton />
        <Skeleton />
      </div>
      <div>
        <Skeleton />
        <Skeleton />
      </div>
      <div>
        <div>
          <Skeleton />
          <Skeleton />
        </div>
        <div>
          <Skeleton />
          <Skeleton />
        </div>
      </div>
      <div>
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  )
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number
  columns?: number 
}) {
  return (
    <div>
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <Skeleton />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex}>
                  <Skeleton />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}