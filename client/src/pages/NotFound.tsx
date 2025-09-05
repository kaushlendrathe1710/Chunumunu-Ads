import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-md shadow-lg">
        <CardContent className="pb-4 pt-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <AlertCircle className="mb-4 h-16 w-16 text-destructive" />
            <h1 className="text-3xl font-bold">404 Page Not Found</h1>
            <p className="mt-4 text-muted-foreground">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-8">
          <Link href="/">
            <Button className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
