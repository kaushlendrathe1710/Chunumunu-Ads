import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TagInput } from '@/components/common/TagInput';
import { toast } from 'react-toastify';

interface Category {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  createdAt: string;
}

interface PopularTag {
  id: number;
  name: string;
  createdAt: string;
  videoCount: string;
}

interface AdCategoriesFormProps {
  categories: string[];
  tags: string[];
  onCategoriesChange: (categories: string[]) => void;
  onTagsChange: (tags: string[]) => void;
}

export const AdCategoriesForm: React.FC<AdCategoriesFormProps> = ({
  categories,
  tags,
  onCategoriesChange,
  onTagsChange,
}) => {
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchPopularTags();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://chunumunu.com/api/categories');
      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data);
      } else {
        console.error('Failed to fetch categories');
        toast.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const response = await fetch('https://chunumunu.com/api/tags/popular');
      if (response.ok) {
        const data: PopularTag[] = await response.json();
        setPopularTags(data.map((tag) => tag.name));
      } else {
        console.error('Failed to fetch popular tags');
        toast.error('Failed to load popular tags');
      }
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      toast.error('Failed to load popular tags');
    } finally {
      setLoadingTags(false);
    }
  };

  const handleCategoryToggle = (categoryName: string, checked: boolean) => {
    if (checked) {
      if (!categories.includes(categoryName)) {
        onCategoriesChange([...categories, categoryName]);
      }
    } else {
      onCategoriesChange(categories.filter((cat) => cat !== categoryName));
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Categories *</CardTitle>
          <CardDescription>
            Select one or more categories that best describe your ad content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <>
              {/* Selected Categories Display */}
              {categories.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm font-medium">Selected Categories:</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category, index) => (
                      <Badge key={index} variant="default">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div>
                <Label className="text-sm font-medium">Available Categories:</Label>
                <ScrollArea className="mt-2 h-64 rounded-md border p-4">
                  <div className="space-y-3">
                    {availableCategories.map((category) => (
                      <div key={category.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={categories.includes(category.name)}
                          onCheckedChange={(checked) =>
                            handleCategoryToggle(category.name, checked as boolean)
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {category.name}
                          </Label>
                          {category.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {categories.length === 0 && (
                <p className="mt-2 text-sm text-red-600">Please select at least one category</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tags Input */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>
            Add relevant tags to help users discover your ad content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTags ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">Loading popular tags...</p>
            </div>
          ) : (
            <TagInput
              tags={tags}
              onTagsChange={onTagsChange}
              placeholder="Add tags to describe your ad content..."
              maxTags={15}
              suggestions={popularTags}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
