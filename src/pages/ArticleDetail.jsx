import React, { useState, useEffect } from 'react';
import { Article } from '@/entities/Article';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

export default function ArticleDetail() {
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  useEffect(() => {
    if (!slug) {
      navigate(createPageUrl('HelpCenter'));
      return;
    }

    const fetchArticle = async () => {
      const articles = await Article.filter({ slug: slug });
      if (articles.length > 0) {
        setArticle(articles[0]);
      }
      setLoading(false);
    };
    fetchArticle();
  }, [slug]);

  if (loading) {
    return <div className="p-8">Loading article...</div>;
  }

  if (!article) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Article not found</h2>
        <Link to={createPageUrl('HelpCenter')}>
          <Button>Back to Help Center</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" className="mb-6" asChild>
          <Link to={createPageUrl('HelpCenter')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Help Center
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{article.title}</CardTitle>
            <p className="text-sm text-gray-500 pt-2">In: {article.category}</p>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}