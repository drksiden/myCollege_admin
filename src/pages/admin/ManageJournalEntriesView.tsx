import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";

interface JournalEntry {
  id: string;
  studentName: string;
  comment?: string;
}

interface ManageJournalEntriesViewProps {
  fields: JournalEntry[];
}

export const ManageJournalEntriesView: React.FC<ManageJournalEntriesViewProps> = ({ fields }) => {
  const form = useForm({
    defaultValues: {
      entries: fields.map(field => ({
        id: field.id,
        comment: field.comment || ''
      }))
    }
  });

  return (
    <div className="w-full max-w-full rounded-lg border bg-background p-4">
      <div className="max-h-[60vh] overflow-y-auto">
        <Table className="w-full max-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-background">Студент</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Посещаемость</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Оценка</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Комментарий</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id} className={index % 2 === 0 ? 'bg-muted' : ''}>
                <TableCell>{field.studentName}</TableCell>
                <TableCell>{/* ... посещаемость ... */}</TableCell>
                <TableCell>{/* ... оценка ... */}</TableCell>
                <TableCell className="max-w-[200px]">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.comment`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Комментарий"
                            className="resize-y min-h-[32px] max-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 