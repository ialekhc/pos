'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/layout/data-table';
import { MetricCard } from '@/components/layout/metric-card';
import { apiRequest } from '@/lib/api/client';
import { Product } from '@/lib/types';

type Category = {
  id: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
    parentId?: string | null;
  } | null;
  name: string;
  description?: string | null;
};

type ProductDraft = {
  name: string;
  sku: string;
  categoryId: string;
  hsCode: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
};

function createDefaultProductDraft(): ProductDraft {
  return {
    name: '',
    sku: '',
    categoryId: '',
    hsCode: '',
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 10
  };
}

function parseRequestError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed';
  }

  const fallback = error.message || 'Request failed';
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function formatCategoryPath(category: Category, categoriesById: Map<string, Category>) {
  const names: string[] = [category.name];
  let cursorParentId = category.parentId ?? category.parent?.id ?? null;
  const visited = new Set<string>();

  while (cursorParentId) {
    if (visited.has(cursorParentId)) {
      break;
    }
    visited.add(cursorParentId);

    const parent = categoriesById.get(cursorParentId);
    if (!parent) {
      break;
    }

    names.unshift(parent.name);
    cursorParentId = parent.parentId ?? parent.parent?.id ?? null;
  }

  return names.join(' > ');
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    parentId: '',
    description: ''
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({
    name: '',
    parentId: '',
    description: ''
  });

  const [form, setForm] = useState<ProductDraft>(createDefaultProductDraft());
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productEditForm, setProductEditForm] = useState<ProductDraft>(createDefaultProductDraft());

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const orderedCategories = useMemo(() => {
    const top = categories.filter((category) => !category.parentId);
    const children = categories.filter((category) => category.parentId);
    return [...top, ...children].sort((a, b) =>
      formatCategoryPath(a, categoryMap).localeCompare(formatCategoryPath(b, categoryMap))
    );
  }, [categories, categoryMap]);
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((product) => product.status === 'ACTIVE').length;
    const lowStockProducts = products.filter(
      (product) => product.stockQuantity <= product.lowStockThreshold
    ).length;
    const totalCategories = categories.filter((category) => !category.parentId).length;
    const totalSubcategories = categories.filter((category) => !!category.parentId).length;

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalCategories,
      totalSubcategories
    };
  }, [categories, products]);

  const loadProducts = async () => {
    try {
      const data = await apiRequest<Product[]>('/products');
      setProducts(data);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiRequest<Category[]>('/categories');
      setCategories(data);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadProducts(), loadCategories()]);
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const createCategory = async (event: FormEvent) => {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      setError('Category name is required.');
      return;
    }

    setIsCreatingCategory(true);
    setError(null);
    setNotice(null);
    try {
      const created = await apiRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          parentId: categoryForm.parentId || undefined,
          description: categoryForm.description.trim() || undefined
        })
      });

      await loadCategories();
      setForm((state) => ({ ...state, categoryId: created.id }));
      setCategoryForm({ name: '', parentId: '', description: '' });
      setNotice(`Category "${created.name}" created.`);
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryEditForm({
      name: category.name,
      parentId: category.parentId ?? category.parent?.id ?? '',
      description: category.description ?? ''
    });
    setError(null);
    setNotice(null);
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCategoryEditForm({ name: '', parentId: '', description: '' });
  };

  const updateCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCategoryId) {
      return;
    }

    setIsUpdatingCategory(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/categories/${editingCategoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: categoryEditForm.name.trim() || undefined,
          parentId: categoryEditForm.parentId || null,
          description: categoryEditForm.description.trim() || undefined
        })
      });
      await refreshAll();
      cancelCategoryEdit();
      setNotice('Category updated.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const removeCategory = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? Products may become uncategorized and direct subcategories will move to top level.`
    );
    if (!confirmed) {
      return;
    }

    setBusyCategoryId(category.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/categories/${category.id}`, {
        method: 'DELETE'
      });
      await refreshAll();
      if (editingCategoryId === category.id) {
        cancelCategoryEdit();
      }
      if (form.categoryId === category.id) {
        setForm((state) => ({ ...state, categoryId: '' }));
      }
      if (productEditForm.categoryId === category.id) {
        setProductEditForm((state) => ({ ...state, categoryId: '' }));
      }
      setNotice('Category deleted.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setBusyCategoryId(null);
    }
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setIsCreatingProduct(true);
    setError(null);
    setNotice(null);

    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || undefined,
          hsCode: form.hsCode.trim() || undefined
        })
      });

      setForm(createDefaultProductDraft());
      await loadProducts();
      setNotice('Product created.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductEditForm({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId ?? product.category?.id ?? '',
      hsCode: product.hsCode ?? '',
      price: Number(product.price),
      costPrice: Number(product.costPrice),
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold
    });
    setError(null);
    setNotice(null);
  };

  const cancelProductEdit = () => {
    setEditingProductId(null);
    setProductEditForm(createDefaultProductDraft());
  };

  const updateProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingProductId) {
      return;
    }

    setIsUpdatingProduct(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/${editingProductId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...productEditForm,
          categoryId: productEditForm.categoryId || undefined,
          hsCode: productEditForm.hsCode.trim() || undefined
        })
      });
      await loadProducts();
      cancelProductEdit();
      setNotice('Product updated.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  const removeProduct = async (product: Product) => {
    const confirmed = window.confirm(`Delete product "${product.name}"?`);
    if (!confirmed) {
      return;
    }

    setBusyProductId(product.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/products/${product.id}`, {
        method: 'DELETE'
      });
      await loadProducts();
      if (editingProductId === product.id) {
        cancelProductEdit();
      }
      setNotice('Product deleted.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{notice}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Products" value={metrics.totalProducts} />
        <MetricCard title="Active Products" value={metrics.activeProducts} />
        <MetricCard title="Low Stock" value={metrics.lowStockProducts} />
        <MetricCard title="Categories" value={metrics.totalCategories} />
        <MetricCard title="Subcategories" value={metrics.totalSubcategories} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create Category</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createCategory}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category Name</label>
              <Input
                placeholder="Beverages"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((state) => ({ ...state, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Parent Category (Optional)</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={categoryForm.parentId}
                onChange={(event) =>
                  setCategoryForm((state) => ({ ...state, parentId: event.target.value }))
                }
              >
                <option value="">Top-level category</option>
                {orderedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {formatCategoryPath(category, categoryMap)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
              <Textarea
                rows={1}
                placeholder="Short category note"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((state) => ({ ...state, description: event.target.value }))
                }
              />
            </div>
            <Button className="md:col-span-3" disabled={isCreatingCategory}>
              {isCreatingCategory ? 'Creating Category...' : 'Add Category'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingCategoryId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={updateCategory}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category Name</label>
                <Input
                  value={categoryEditForm.name}
                  onChange={(event) =>
                    setCategoryEditForm((state) => ({ ...state, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Parent Category (Optional)</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={categoryEditForm.parentId}
                  onChange={(event) =>
                    setCategoryEditForm((state) => ({ ...state, parentId: event.target.value }))
                  }
                >
                  <option value="">Top-level category</option>
                  {orderedCategories
                    .filter((category) => category.id !== editingCategoryId)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {formatCategoryPath(category, categoryMap)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description (Optional)</label>
                <Textarea
                  rows={1}
                  value={categoryEditForm.description}
                  onChange={(event) =>
                    setCategoryEditForm((state) => ({ ...state, description: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <Button disabled={isUpdatingCategory}>
                  {isUpdatingCategory ? 'Saving...' : 'Save Category Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelCategoryEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Category List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Category', 'Type', 'Parent', 'Description', 'Actions']}
            rows={categories.map((category) => [
              formatCategoryPath(category, categoryMap),
              category.parentId ? 'Subcategory' : 'Category',
              category.parentId
                ? categoryMap.get(category.parentId)?.name ?? category.parent?.name ?? '-'
                : '-',
              category.description ?? '-',
              <div key={`${category.id}-actions`} className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEditCategory(category)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyCategoryId === category.id}
                  onClick={() => removeCategory(category)}
                >
                  {busyCategoryId === category.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            ])}
            emptyMessage="No categories found."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createProduct}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">SKU</label>
              <Input
                value={form.sku}
                onChange={(event) => setForm((state) => ({ ...state, sku: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.categoryId}
                onChange={(event) => setForm((state) => ({ ...state, categoryId: event.target.value }))}
              >
                <option value="">No category</option>
                {orderedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {formatCategoryPath(category, categoryMap)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">HS Code (Optional)</label>
              <Input
                value={form.hsCode}
                onChange={(event) => setForm((state) => ({ ...state, hsCode: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Price</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price || ''}
                onChange={(event) => setForm((state) => ({ ...state, price: Number(event.target.value || 0) }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cost Price</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice || ''}
                onChange={(event) =>
                  setForm((state) => ({ ...state, costPrice: Number(event.target.value || 0) }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Opening Stock</label>
              <Input
                type="number"
                min={0}
                value={form.stockQuantity || ''}
                onChange={(event) =>
                  setForm((state) => ({ ...state, stockQuantity: Number(event.target.value || 0) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Low Stock Threshold</label>
              <Input
                type="number"
                min={0}
                value={form.lowStockThreshold || ''}
                onChange={(event) =>
                  setForm((state) => ({ ...state, lowStockThreshold: Number(event.target.value || 0) }))
                }
              />
            </div>
            <Button className="md:col-span-3" disabled={isCreatingProduct}>
              {isCreatingProduct ? 'Adding Product...' : 'Add Product'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingProductId ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={updateProduct}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Product Name</label>
                <Input
                  value={productEditForm.name}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">SKU</label>
                <Input
                  value={productEditForm.sku}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, sku: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={productEditForm.categoryId}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, categoryId: event.target.value }))
                  }
                >
                  <option value="">No category</option>
                  {orderedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {formatCategoryPath(category, categoryMap)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">HS Code (Optional)</label>
                <Input
                  value={productEditForm.hsCode}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, hsCode: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Price</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productEditForm.price || ''}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, price: Number(event.target.value || 0) }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cost Price</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productEditForm.costPrice || ''}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, costPrice: Number(event.target.value || 0) }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stock Quantity</label>
                <Input
                  type="number"
                  min={0}
                  value={productEditForm.stockQuantity || ''}
                  onChange={(event) =>
                    setProductEditForm((state) => ({ ...state, stockQuantity: Number(event.target.value || 0) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Low Stock Threshold</label>
                <Input
                  type="number"
                  min={0}
                  value={productEditForm.lowStockThreshold || ''}
                  onChange={(event) =>
                    setProductEditForm((state) => ({
                      ...state,
                      lowStockThreshold: Number(event.target.value || 0)
                    }))
                  }
                />
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <Button disabled={isUpdatingProduct}>
                  {isUpdatingProduct ? 'Saving...' : 'Save Product Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelProductEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Name', 'SKU', 'Category', 'HS Code', 'Price', 'Stock', 'Threshold', 'Status', 'Actions']}
            rows={products.map((product) => [
              product.name,
              product.sku,
              product.categoryId && categoryMap.get(product.categoryId)
                ? formatCategoryPath(categoryMap.get(product.categoryId)!, categoryMap)
                : product.category?.parent
                  ? `${product.category.parent.name} > ${product.category.name}`
                  : product.category?.name ?? '-',
              product.hsCode ?? '-',
              `$${Number(product.price).toFixed(2)}`,
              product.stockQuantity,
              product.lowStockThreshold,
              product.status,
              <div key={`${product.id}-actions`} className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEditProduct(product)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyProductId === product.id}
                  onClick={() => removeProduct(product)}
                >
                  {busyProductId === product.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            ])}
          />
        </CardContent>
      </Card>
    </div>
  );
}
