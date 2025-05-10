'use client';

import type { FC } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  guardReportSchema,
  GuardReportFormValues,
  lightsOffLocationsArray,
  lockedLocationsArray,
  roundsCompletedOptionsArray,
  imageUploadLocationsArray,
} from '@/lib/form-schema';
import { submitGuardReport } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import { User, LightbulbOff, Lock, Repeat, Camera, AlertCircle } from 'lucide-react';

const initialFormState = {
  success: false,
  message: '',
  errors: undefined,
};

const normalizeLocationNameClient = (name: string) => `image${name.replace(/[^a-zA-Z0-9]/g, '')}`;

const SubmitButton: FC = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Submitting...' : 'Submit Report'}
    </Button>
  );
};

interface FormErrorProps {
  messages?: string[];
}

const FormError: FC<FormErrorProps> = ({ messages }) => {
  if (!messages || messages.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center space-x-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>{messages.join(', ')}</span>
    </div>
  );
};


export const GuardForm: FC = () => {
  const [state, formAction] = useActionState(submitGuardReport, initialFormState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [fileNames, setFileNames] = useState<Record<string, string>>({});

  const {
    register,
    control,
    formState: { errors: clientErrors },
    reset,
    setValue,
  } = useForm<GuardReportFormValues>({
    resolver: zodResolver(guardReportSchema),
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (state.success) {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset(); 
      reset(); 
      setFileNames({}); 
    } else if (state.message && !state.success) { 
      // This condition now covers all errors with a message,
      // whether they are validation errors (state.errors is truthy)
      // or general server errors (state.errors is falsy).
      const title = state.errors ? 'Validation Error' : 'Submission Error';
      toast({
        title: title,
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, reset]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fieldName: keyof GuardReportFormValues) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue(fieldName, file as any, { shouldValidate: true });
      setFileNames(prev => ({ ...prev, [fieldName]: file.name }));
    } else {
      setValue(fieldName, undefined as any, { shouldValidate: true });
      setFileNames(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const combinedErrors = { ...clientErrors, ...state.errors };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">GuardEase Report</CardTitle>
        <CardDescription className="text-center">Please fill out all fields accurately.</CardDescription>
      </CardHeader>
      <form action={formAction} ref={formRef} noValidate>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center"><User className="mr-2 h-5 w-5 text-primary" />Guard Information</h3>
            <div className="space-y-2">
              <Label htmlFor="guardName">Guard Name</Label>
              <Input id="guardName" {...register('guardName')} placeholder="Enter your full name" aria-invalid={!!combinedErrors?.guardName} />
              <FormError messages={combinedErrors?.guardName?.message ? [combinedErrors.guardName.message] : (combinedErrors?.guardName as unknown as string[])} />
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center"><LightbulbOff className="mr-2 h-5 w-5 text-primary" />Lights & Locks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lightsOffLocation">Lights Switched Off Location</Label>
                <Controller
                  name="lightsOffLocation"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} >
                      <SelectTrigger id="lightsOffLocation" aria-invalid={!!combinedErrors?.lightsOffLocation}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {lightsOffLocationsArray.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                 <FormError messages={combinedErrors?.lightsOffLocation?.message ? [combinedErrors.lightsOffLocation.message] : (combinedErrors?.lightsOffLocation as unknown as string[])} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockedLocation">Locked Location</Label>
                 <Controller
                  name="lockedLocation"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="lockedLocation" aria-invalid={!!combinedErrors?.lockedLocation}>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {lockedLocationsArray.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormError messages={combinedErrors?.lockedLocation?.message ? [combinedErrors.lockedLocation.message] : (combinedErrors?.lockedLocation as unknown as string[])} />
              </div>
            </div>
          </div>
          
           <div className="space-y-4 p-4 border rounded-lg shadow-sm">
             <h3 className="text-lg font-semibold flex items-center"><Repeat className="mr-2 h-5 w-5 text-primary" />Rounds Completed</h3>
              <div className="space-y-2">
                <Label htmlFor="roundsCompleted">Number of Rounds</Label>
                <Controller
                  name="roundsCompleted"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="roundsCompleted" aria-invalid={!!combinedErrors?.roundsCompleted}>
                        <SelectValue placeholder="Select rounds" />
                      </SelectTrigger>
                      <SelectContent>
                        {roundsCompletedOptionsArray.map(num => <SelectItem key={num} value={num}>{num}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormError messages={combinedErrors?.roundsCompleted?.message ? [combinedErrors.roundsCompleted.message] : (combinedErrors?.roundsCompleted as unknown as string[])} />
              </div>
           </div>

          <div className="space-y-4 p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold flex items-center"><Camera className="mr-2 h-5 w-5 text-primary" />Location Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {imageUploadLocationsArray.map(location => {
                const fieldName = normalizeLocationNameClient(location) as keyof GuardReportFormValues;
                return (
                  <div key={location} className="space-y-2">
                    <Label htmlFor={fieldName}>{location}</Label>
                    <Input 
                      id={fieldName} 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp"
                      name={fieldName} 
                      onChange={(e) => handleFileChange(e, fieldName)}
                      aria-invalid={!!(combinedErrors as any)?.[fieldName]}
                      className="file:text-primary file:font-semibold hover:file:bg-primary/10"
                    />
                    {fileNames[fieldName] && <p className="text-xs text-muted-foreground mt-1">Selected: {fileNames[fieldName]}</p>}
                    <FormError messages={(combinedErrors as any)?.[fieldName]?.message ? [(combinedErrors as any)[fieldName].message] : ((combinedErrors as any)?.[fieldName] as string[])} />
                  </div>
                );
              })}
            </div>
          </div>
          <Separator />
           {/* This inline message is specifically for server errors that aren't validation field errors */}
           {state.message && !state.success && !state.errors && (
             <div className="flex items-center space-x-2 text-sm text-destructive p-2 bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{state.message}</span>
              </div>
           )}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
};
