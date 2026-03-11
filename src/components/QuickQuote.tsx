import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function QuickQuote() {
  const [fipe, setFipe] = useState('');
  const [cat, setCat] = useState('Particular');

  const fipeNum = Number(fipe) || 0;
  const isApp = cat === 'App/Aluguel';
  const franquia = fipeNum > 0
    ? isApp ? fipeNum * 0.06 : Math.max(fipeNum * 0.04, 1200)
    : null;
  const mensalidade = fipeNum > 0 ? fipeNum * 0.028 : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Calculator className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Calculadora Rápida</p>
          <div>
            <Label className="text-xs">Valor FIPE</Label>
            <Input type="number" placeholder="120000" value={fipe} onChange={(e) => setFipe(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Particular">Particular</SelectItem>
                <SelectItem value="App/Aluguel">App/Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fipeNum > 0 && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mensalidade</span>
                <span className="font-bold text-foreground">{fmt(mensalidade!)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Franquia ({isApp ? '6%' : '4%'})</span>
                <span className="font-bold text-primary">{fmt(franquia!)}</span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
