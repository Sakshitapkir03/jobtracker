"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contactsApi } from "@/lib/api";
import type { Contact } from "@/types";

interface Props {
  companyId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}

export default function ContactsDialog({ companyId, companyName, open, onClose }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    try {
      const res = await contactsApi.search(companyId);
      setContacts(res.data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen(isOpen: boolean) {
    if (isOpen && !searched) {
      setLoading(true);
      try {
        const res = await contactsApi.list(companyId);
        setContacts(res.data);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contacts at {companyName}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-4">
          <Button onClick={handleSearch} disabled={loading} size="sm">
            {loading ? "Searching..." : searched ? "Refresh" : "Find Contacts"}
          </Button>
        </div>

        {contacts.length === 0 && searched && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No contacts found. Try refreshing or add an Apollo API key.
          </p>
        )}

        {!searched && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Click "Find Contacts" to search for people at this company.
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        <div className="space-y-3">
          {contacts.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{c.name}</span>
                {c.title && <Badge variant="secondary" className="text-xs">{c.title}</Badge>}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                {c.linkedin_url && (
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline">
                    LinkedIn
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="text-blue-500 hover:underline">
                    {c.email}
                  </a>
                )}
                {!c.linkedin_url && !c.email && <span>No contact info available</span>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
