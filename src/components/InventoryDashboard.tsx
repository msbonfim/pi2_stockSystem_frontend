import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Calendar, Package, Plus, Search, Filter, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts, useCreateProduct, useDashboardStats } from "@/hooks/useProducts";
import { Product, CreateProductRequest } from "@/services/api";

// Remove a interface duplicada e os dados mockados

export function InventoryDashboard() {
  // Estados locais para dados
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    total_products: 0,
    expired_products: 0,
    critical_products: 0,
    expiring_soon: 0,
    good_products: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados locais
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<CreateProductRequest>>({});

  // Função para processar dados da API
  const processProductData = (products: any[]) => {
    return products.map(product => {
      console.log(`🔍 Processando produto: ${product.name}`);
      console.log(`🔍 Data original: ${product.expiration_date}`);
      
      const processedProduct = {
        ...product,
        price: Number(product.price) || 0,
        quantity: Number(product.quantity) || 0,
        // Garantir que as datas estão no formato correto
        expiration_date: product.expiration_date || product.expiry_date,
        // Garantir que category_name existe
        category_name: product.category_name || 'Sem categoria'
      };
      
      console.log(`🔍 Data processada: ${processedProduct.expiration_date}`);
      return processedProduct;
    });
  };

  // Carregar dados da API
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Carregando dados da API...');
      
      // Carregar produtos
      const productsResponse = await fetch('https://pi2-stocksystem-backend.onrender.com/api/products/');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log('📦 Produtos recebidos do backend:', productsData.length);
        const processedProducts = processProductData(productsData);
        console.log('✅ Produtos processados:', processedProducts);
        setProducts(processedProducts);
      } else {
        console.error('❌ Erro ao carregar produtos:', productsResponse.status);
      }
      
      // Carregar estatísticas
      const statsResponse = await fetch('https://pi2-stocksystem-backend.onrender.com/api/dashboard/stats/');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Estatísticas recebidas:', statsData);
        setStats(statsData);
      } else {
        console.error('❌ Erro ao carregar estatísticas:', statsResponse.status);
      }
    } catch (err) {
      setError('Erro ao carregar dados. Verifique se o backend está rodando.');
      console.error('❌ Erro geral:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados quando o componente monta
  useEffect(() => {
    loadData();
  }, []);

  const getExpiryStatus = (expirationDate: string) => {
    // Criar datas apenas com ano, mês e dia (sem horário)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas datas
    
    // Corrigir problema de timezone - usar apenas a parte da data
    const expiry = new Date(expirationDate + 'T00:00:00');
    expiry.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas datas
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    console.log(`📅 Produto: ${expirationDate}`);
    console.log(`📅 Hoje: ${today.toISOString().split('T')[0]}`);
    console.log(`📅 Expiry: ${expiry.toISOString().split('T')[0]}`);
    console.log(`📅 Diferença: ${diffDays} dias`);
    console.log(`📅 Status: ${diffDays < 0 ? 'expired' : diffDays <= 3 ? 'critical' : diffDays <= 7 ? 'warning' : 'good'}`);

    if (diffDays < 0) return 'expired';      // Vencido (roxo)
    if (diffDays <= 3) return 'critical';    // 0-3 dias: crítico (vermelho)
    if (diffDays <= 7) return 'warning';     // 4-7 dias: aviso (laranja)
    return 'good';                          // >7 dias: bom (verde)
  };

  const getStatusColor = (status: string) => {
    console.log(`🎨 Aplicando cor para status: ${status}`);
    switch (status) {
      case 'expired': return 'bg-gradient-purple shadow-purple border-purple';
      case 'critical': return 'bg-gradient-danger shadow-danger border-danger';
      case 'warning': return 'bg-gradient-warning shadow-alert border-warning';
      case 'good': return 'bg-gradient-success shadow-success border-success';
      default: return 'bg-card';
    }
  };

  const getStatusBadge = (status: string, days: number) => {
    switch (status) {
      case 'expired': return <Badge variant="destructive">Vencido</Badge>;
      case 'critical': return <Badge variant="destructive">{days} dia{days !== 1 ? 's' : ''}</Badge>;
      case 'warning': return <Badge className="bg-warning text-warning-foreground">{days} dias</Badge>;
      case 'good': return <Badge className="bg-success text-success-foreground">{days}+ dias</Badge>;
      default: return null;
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "" || product.category_name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category_name).filter(Boolean))];
  }, [products]);

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.quantity && newProduct.expiration_date) {
      try {
        const response = await fetch('https://pi2-stocksystem-backend.onrender.com/api/products/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newProduct.name,
            description: newProduct.description,
            price: Number(newProduct.price) || 0,
            quantity: Number(newProduct.quantity) || 0,
            expiration_date: newProduct.expiration_date,
            category: newProduct.category,
            batch: newProduct.batch
          })
        });
        
        if (response.ok) {
          setNewProduct({});
          setIsDialogOpen(false);
          // Recarregar dados
          loadData();
        }
      } catch (err) {
        console.error('Erro ao criar produto:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sistema de Estoque</h1>
            <p className="text-muted-foreground">Controle de validade e gestão de produtos</p>
          </div>
          {/* <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>

            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
                <DialogDescription>
                  Adicione um novo produto ao estoque
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Produto</Label>
                  <Input
                    id="name"
                    value={newProduct.name || ""}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Ex: Leite Integral"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price || ""}
                    onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                    placeholder="Ex: 15.99"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newProduct.quantity || ""}
                    onChange={(e) => setNewProduct({...newProduct, quantity: Number(e.target.value)})}
                    placeholder="Ex: 25"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expirationDate">Data de Validade</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={newProduct.expiration_date || ""}
                    onChange={(e) => setNewProduct({...newProduct, expiration_date: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="batch">Lote (Opcional)</Label>
                  <Input
                    id="batch"
                    value={newProduct.batch || ""}
                    onChange={(e) => setNewProduct({...newProduct, batch: e.target.value})}
                    placeholder="Ex: LT2024081"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description || ""}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Descrição do produto..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddProduct} className="bg-gradient-primary">
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog> */}
          <a 
            href="https://pi2-stocksystem-backend.onrender.com/admin/" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-primary shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Login
            </Button>
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats.total_products}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple">
                {isLoading ? "..." : stats.expired_products}
              </div>
              <p className="text-xs text-muted-foreground">
                Requer atenção imediata
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-danger">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger">
                {isLoading ? "..." : stats.critical_products}
              </div>
              <p className="text-xs text-muted-foreground">
                0-3 dias
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencendo em Breve</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {isLoading ? "..." : stats.expiring_soon}
              </div>
              <p className="text-xs text-muted-foreground">
                4-7 dias
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Bom Estado</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {isLoading ? "..." : stats.good_products}
              </div>
              <p className="text-xs text-muted-foreground">
                Mais de 7 dias
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Label htmlFor="category" className="sr-only">Categoria</Label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando produtos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadData} className="mt-4">Tentar Novamente</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const status = getExpiryStatus(product.expiration_date);
              const expiryDate = new Date(product.expiration_date);
              const today = new Date();
              
              // Zerar horários para cálculo correto
              today.setHours(0, 0, 0, 0);
              expiryDate.setHours(0, 0, 0, 0);
              
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <Card key={product.id} className={cn("shadow-card transition-all hover:scale-105", getStatusColor(status))}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg text-white">{product.name}</CardTitle>
                        <CardDescription className="text-white/80">{product.category_name || 'Sem categoria'}</CardDescription>
                      </div>
                      {getStatusBadge(status, Math.abs(daysUntilExpiry))}
                    </div>
                  </CardHeader>
                  <CardContent className="text-white/90">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Quantidade:</span>
                        <span className="font-semibold">{Number(product.quantity) || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Preço:</span>
                        <span className="font-semibold">R$ {Number(product.price).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Validade:</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(product.expiration_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      {product.batch && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Lote:</span>
                          <span className="font-semibold">{product.batch}</span>
                        </div>
                      )}
                      {product.description && (
                        <p className="text-sm text-white/70 mt-3">{product.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}