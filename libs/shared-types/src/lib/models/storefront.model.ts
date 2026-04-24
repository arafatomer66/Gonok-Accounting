export interface IStorefrontProduct {
  uuid: string;
  name: string | null;
  slug: string;
  description: string | null;
  sales_price: number;
  mrp_price: number;
  discount: number;
  unit: string | null;
  category_uuid: string | null;
  category_name: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  quantity: number;
  in_stock: boolean;
}

export interface IStorefrontCategory {
  uuid: string;
  name: string | null;
}

export interface IStorefrontBusiness {
  uuid: string;
  name_en: string | null;
  name_bn: string | null;
  slug: string;
  phone: string | null;
  display_phone: string | null;
  logo_url: string;
  address: {
    display_address: string | null;
    city: string | null;
    district: string | null;
    country_code: string | null;
  };
}

export interface IStorefrontProductsResponse {
  products: IStorefrontProduct[];
  total: number;
  page: number;
  limit: number;
}
