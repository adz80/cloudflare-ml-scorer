import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, ShieldCheck, Copy, Check, ChevronsUpDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
type HttpMethod = 'POST' | 'PUT';
interface InspectionResult {
  'Bot-Score': string;
  'Waf-Attack-Score': string;
  'Waf-Rce-Score': string;
  'Waf-Sqi-Score': string;
  'Waf-Xss-Score': string;
}
type ScoreName = keyof InspectionResult;
const friendlyHeaderNames: Record<ScoreName, string> = {
  'Bot-Score': 'Bot Score',
  'Waf-Attack-Score': 'WAF Attack Score',
  'Waf-Rce-Score': 'WAF RCE Score',
  'Waf-Sqi-Score': 'WAF SQI Score',
  'Waf-Xss-Score': 'WAF XSS Score',
};
const transformRuleMap: Record<ScoreName, string> = {
  'Bot-Score': 'bot-score = cf.bot_management.score',
  'Waf-Attack-Score': 'waf-attack-score = cf.waf.score',
  'Waf-Rce-Score': 'waf-rce-score = cf.waf.score.rce',
  'Waf-Sqi-Score': 'waf-sqi-score = cf.waf.score.sqli',
  'Waf-Xss-Score': 'waf-xss-score = cf.waf.score.xss',
};
interface ScoreInfo {
  className: string;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}
const getScoreInfo = (scoreName: ScoreName, scoreValue: string): ScoreInfo => {
  const score = parseInt(scoreValue, 10);
  if (isNaN(score)) {
    return { className: 'text-slate-500 dark:text-slate-400', label: 'Not Available', badgeVariant: 'secondary' };
  }
  if (scoreName === 'Bot-Score') {
    if (score === 1) return { className: 'text-red-500 font-bold', label: 'Automated', badgeVariant: 'destructive' };
    if (score >= 2 && score <= 29) return { className: 'text-orange-500 font-bold', label: 'Likely Automated', badgeVariant: 'secondary' };
    if (score >= 30 && score <= 100) return { className: 'text-green-500 font-bold', label: 'Likely Human', badgeVariant: 'default' };
  } else { // WAF Scores
    if (score >= 0 && score <= 50) return { className: 'text-red-500 font-bold', label: 'Likely Attack', badgeVariant: 'destructive' };
    if (score >= 51 && score <= 80) return { className: 'text-orange-500 font-bold', label: 'Likely Clean', badgeVariant: 'secondary' };
    if (score >= 81 && score <= 100) return { className: 'text-green-500 font-bold', label: 'Clean', badgeVariant: 'default' };
  }
  return { className: '', label: 'Unknown', badgeVariant: 'outline' };
};
const defaultPayload = JSON.stringify(
  {
    user: {
      id: 123,
      username: 'test_user',
      email: 'test@example.com',
    },
    action: 'update_profile',
    data: {
      bio: "Hello, world! <script>alert('xss')</script>",
      website: "https://example.com?id=1' OR '1'='1",
    },
  },
  null,
  2
);
export function HomePage() {
  const [payload, setPayload] = useState<string>(defaultPayload);
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<InspectionResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPayloadOpen, setIsPayloadOpen] = useState(true);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isCurlOpen, setIsCurlOpen] = useState(false);
  const generateCurlCommand = () => {
    try {
      const parsedPayload = JSON.parse(payload);
      const compactPayload = JSON.stringify(parsedPayload);
      // Escape single quotes for the shell command
      const escapedPayload = compactPayload.replace(/'/g, "'\\''");
      return `curl -X ${method} \\\n  -H "Content-Type: application/json" \\\n  -d '${escapedPayload}' \\\n  '${window.location.origin}/api/inspect'`;
    } catch {
      return 'Invalid JSON payload for cURL command.';
    }
  };
  const handleCopy = () => {
    const command = generateCurlCommand();
    if (command.startsWith('curl')) {
      navigator.clipboard.writeText(command.replace(/\\\n\s*/g, ' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setIsResultsOpen(true);
    setIsCurlOpen(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (jsonError) {
        throw new Error('Invalid JSON payload. Please check the syntax.');
      }
      const response = await fetch('/api/inspect', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedPayload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: InspectionResult = await response.json();
      setResults(data);
      setIsPayloadOpen(false); // Collapse payload on success
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-50">
      <ThemeToggle className="fixed top-4 right-4" />
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full border-4 border-white dark:border-slate-700 shadow-sm">
            <ShieldCheck className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Cloudflare Machine Learning Model scores
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Analyze WAF and Bot security scores by submitting sample HTTP payloads to a Cloudflare Worker backend.
          </p>
        </div>
        <div className="mt-12 space-y-8">
          <Collapsible open={isPayloadOpen} onOpenChange={setIsPayloadOpen}>
            <Card className="shadow-lg dark:shadow-2xl dark:bg-slate-900/50 dark:border-slate-700">
              <form onSubmit={handleSubmit}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Inspect Payload</CardTitle>
                    <CardDescription>
                      Enter a JSON payload, select a method, and click inspect to see the security headers.
                    </CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronsUpDown className="h-4 w-4" />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="payload">JSON Payload</Label>
                      <Textarea
                        id="payload"
                        name="payload"
                        placeholder='{ "key": "value" }'
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        className="min-h-[200px] font-mono text-sm dark:bg-slate-800 dark:border-slate-600 focus:ring-blue-500"
                        rows={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HTTP Method</Label>
                      <RadioGroup
                        value={method}
                        onValueChange={(value: string) => setMethod(value as HttpMethod)}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="POST" id="r-post" />
                          <Label htmlFor="r-post">POST</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PUT" id="r-put" />
                          <Label htmlFor="r-put">PUT</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:text-white transition-all duration-200">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Inspecting...
                        </>
                      ) : (
                        'Inspect'
                      )}
                    </Button>
                  </CardFooter>
                </CollapsibleContent>
              </form>
            </Card>
          </Collapsible>
          <AnimatePresence>
            {(loading || error || results) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen}>
                  <Card className="shadow-lg dark:shadow-2xl dark:bg-slate-900/50 dark:border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Inspection Results</CardTitle>
                        <CardDescription>
                          The following security headers were observed at the edge.
                        </CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        {loading && (
                          <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                              <Skeleton key={i} className="h-8 w-full" />
                            ))}
                          </div>
                        )}
                        {error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                        {results && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">ML Score</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Classification</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(results).map(([key, value]) => {
                                const scoreName = key as ScoreName;
                                const { className, label, badgeVariant } = getScoreInfo(scoreName, value);
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium">{friendlyHeaderNames[scoreName]}</TableCell>
                                    <TableCell className={cn("font-mono", className)}>{value}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={badgeVariant}>{label}</Badge>
                                        {value === 'N/A' && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Info className="h-4 w-4 text-slate-500 cursor-pointer" />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                              <div className="grid gap-4">
                                                <div className="space-y-2">
                                                  <h4 className="font-medium leading-none">Configuration Tip</h4>
                                                  <p className="text-sm text-muted-foreground">
                                                    To see this score, create a Transform Rule for dynamic header insertion:
                                                  </p>
                                                </div>
                                                <code className="relative rounded bg-slate-100 dark:bg-slate-800 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-slate-900 dark:text-slate-200">
                                                  {transformRuleMap[scoreName]}
                                                </code>
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
                <Collapsible open={isCurlOpen} onOpenChange={setIsCurlOpen}>
                  <Card className="shadow-lg dark:shadow-2xl dark:bg-slate-900/50 dark:border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>cURL Command</CardTitle>
                        <CardDescription>
                          Use this command to reproduce the request from your terminal.
                        </CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="relative p-4 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-sm overflow-x-auto">
                          <pre><code>{generateCurlCommand()}</code></pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={handleCopy}
                          >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <footer className="text-center mt-16 text-slate-500 dark:text-slate-400 text-sm">
            <p>Built with ❤️ at Cloudflare</p>
        </footer>
      </main>
    </div>
  );
}