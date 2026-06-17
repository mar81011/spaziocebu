import { useState, type FormEvent } from "react";
import {
  addCategory,
  addMenuItem,
  deleteCategory,
  deleteMenuItem,
  resetMenu,
  updateCategory,
  updateMenuItem,
} from "../../lib/storage";
import { useMenu } from "../../hooks/useMenu";

export function MenuPanel() {
  const { menu } = useMenu();
  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string; description: string }>>({});

  function getDraft(categoryId: string) {
    return drafts[categoryId] ?? { name: "", price: "", description: "" };
  }

  function setDraft(categoryId: string, patch: Partial<{ name: string; price: string; description: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [categoryId]: { ...getDraft(categoryId), ...patch },
    }));
  }

  function handleAddCategory() {
    const title = prompt("Category title (e.g. Coffee, Add-Ons):");
    if (!title?.trim()) return;
    addCategory(title);
  }

  function handleAddItem(e: FormEvent, categoryId: string) {
    e.preventDefault();
    const draft = getDraft(categoryId);
    if (!draft.name.trim()) return;
    addMenuItem(categoryId, {
      name: draft.name,
      description: draft.description,
      price: parseInt(draft.price, 10) || 0,
    });
    setDraft(categoryId, { name: "", price: "", description: "" });
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium">Menu</h1>
          <p className="mt-1 text-sm text-warm-gray">
            Organise categories and items. Changes appear on the customer homepage instantly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset menu to default Coffee + Add-Ons sample?")) resetMenu();
            }}
            className="rounded-lg border border-espresso/12 bg-white px-4 py-2.5 text-sm"
          >
            Reset menu
          </button>
          <button
            type="button"
            onClick={handleAddCategory}
            className="rounded-lg bg-terracotta px-4 py-2.5 text-sm text-white"
          >
            + Add category
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {menu.categories.length === 0 ? (
          <p className="rounded-[14px] bg-white p-12 text-center text-warm-gray shadow-sm">
            No categories yet. Click <strong>+ Add category</strong> to start.
          </p>
        ) : (
          menu.categories.map((category) => (
            <section
              key={category.id}
              className="overflow-hidden rounded-[14px] border border-white/90 bg-white shadow-[0_8px_30px_rgba(26,18,14,0.08)]"
            >
              <div className="flex items-center gap-3 border-b border-espresso/8 bg-cream px-5 py-4">
                <input
                  defaultValue={category.title}
                  onBlur={(e) => updateCategory(category.id, e.target.value)}
                  className="flex-1 border-b border-dashed border-transparent bg-transparent font-serif text-2xl font-semibold outline-none focus:border-terracotta"
                  aria-label="Category title"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this category and all its items?")) deleteCategory(category.id);
                  }}
                  className="text-sm text-warm-gray hover:text-red-700"
                >
                  Delete category
                </button>
              </div>

              <div className="divide-y divide-espresso/5">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 px-5 py-3 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-center"
                  >
                    <input
                      defaultValue={item.name}
                      onBlur={(e) => updateMenuItem(category.id, item.id, { name: e.target.value })}
                      className="rounded-md border border-espresso/10 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      defaultValue={item.price}
                      onBlur={(e) =>
                        updateMenuItem(category.id, item.id, { price: parseInt(e.target.value, 10) || 0 })
                      }
                      className="rounded-md border border-espresso/10 px-2 py-1.5 text-sm"
                    />
                    <input
                      defaultValue={item.description}
                      onBlur={(e) =>
                        updateMenuItem(category.id, item.id, { description: e.target.value })
                      }
                      className="rounded-md border border-espresso/10 px-2 py-1.5 text-sm"
                      placeholder="Description"
                    />
                    <button
                      type="button"
                      onClick={() => deleteMenuItem(category.id, item.id)}
                      className="text-sm text-warm-gray hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => handleAddItem(e, category.id)}
                className="grid gap-3 border-t border-espresso/6 bg-cream/50 px-5 py-4 sm:grid-cols-[1fr_100px_1fr_auto] sm:items-center"
              >
                <input
                  placeholder="Item name"
                  value={getDraft(category.id).name}
                  onChange={(e) => setDraft(category.id, { name: e.target.value })}
                  className="rounded-md border border-espresso/12 px-2 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="₱"
                  value={getDraft(category.id).price}
                  onChange={(e) => setDraft(category.id, { price: e.target.value })}
                  className="rounded-md border border-espresso/12 px-2 py-2 text-sm"
                />
                <input
                  placeholder="Short description"
                  value={getDraft(category.id).description}
                  onChange={(e) => setDraft(category.id, { description: e.target.value })}
                  className="rounded-md border border-espresso/12 px-2 py-2 text-sm"
                />
                <button type="submit" className="rounded-md bg-terracotta px-3 py-2 text-sm text-white">
                  Add
                </button>
              </form>
            </section>
          ))
        )}
      </div>
    </>
  );
}
