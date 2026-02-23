import { useState, useEffect } from 'react';
import { getProducts, Product } from '../services/api';
import { Package, ChevronDown, ListFilter, RefreshCw } from 'lucide-react';

interface ProductSelectorProps {
    onSelect: (product: Product) => void;
    selectedProduct?: Product;
}

const ProductSelector = ({ onSelect, selectedProduct }: ProductSelectorProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    return (
        <div className="relative inline-block text-left w-64">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                <ListFilter size={12} />
                Product Context
            </div>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-secondary border border-gray-700 rounded-lg hover:border-primary transition-all duration-200 group"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Package size={18} className="text-primary" />
                    <span className="truncate text-foreground font-medium">
                        {selectedProduct ? selectedProduct.name : 'Select a Product'}
                    </span>
                </div>
                <ChevronDown size={18} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-secondary border border-gray-700 rounded-lg shadow-2xl overflow-hidden backdrop-blur-md">
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-3 text-gray-400">
                                <RefreshCw size={16} className="animate-spin text-primary" />
                                <span>Fetching products...</span>
                            </div>
                        ) : products.length > 0 ? (
                            products.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        onSelect(product);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex items-center justify-between ${selectedProduct?.id === product.id ? 'bg-primary/20 text-primary' : 'text-gray-300'
                                        }`}
                                >
                                    <span className="truncate font-medium">{product.name}</span>
                                    {selectedProduct?.id === product.id && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 italic">
                                No products found
                            </div>
                        )}

                        <button
                            onClick={fetchProducts}
                            className="w-full p-2 border-t border-gray-700 text-xs text-gray-400 hover:text-foreground flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={12} />
                            Reload List
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductSelector;
