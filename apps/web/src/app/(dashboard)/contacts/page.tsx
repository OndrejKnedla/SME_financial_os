'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ContactDialog } from '@/components/contacts/contact-dialog';

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.contact.list.useQuery({
    search: search || undefined,
    limit: 50,
  });

  const deleteMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const contacts = data?.items ?? [];

  const handleEdit = (contactId: string) => {
    setEditingContact(contactId);
    setIsDialogOpen(true);
  };

  const handleDelete = (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate({ id: contactId });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    refetch();
  };

  return (
    <div className="flex flex-col">
      <Header title="Contacts">
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        {/* Search */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Empty State */}
        {!isLoading && contacts.length === 0 && !search && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No contacts yet</CardTitle>
              <CardDescription>
                Add your customers and suppliers to easily create invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No search results */}
        {!isLoading && contacts.length === 0 && search && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No contacts found matching "{search}"</p>
          </div>
        )}

        {/* Contacts Table */}
        {contacts.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact: typeof contacts[number]) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <Badge variant={contact.type === 'COMPANY' ? 'default' : 'secondary'}>
                        {contact.type === 'COMPANY' ? 'Company' : 'Individual'}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.email ?? '-'}</TableCell>
                    <TableCell>{contact.taxId ?? '-'}</TableCell>
                    <TableCell>{contact.paymentTerms} days</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(contact.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(contact.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <ContactDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        contactId={editingContact}
      />
    </div>
  );
}
