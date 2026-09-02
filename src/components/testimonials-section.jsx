import { cn } from "@/lib/utils";
import { InfiniteSlider } from "@/components/infinite-slider";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import InstagramPhone from "@/components/InstagramPhone";

const testimonials = [
	{
		quote:
			"Получили вещи, которые выглядят дороже, чем всё, что брали до этого. Без лишнего пафоса, но с сильным ощущением качества.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dmitry",
		name: "Дмитрий Соколов",
		role: "Покупатель",
		company: "Москва",
	},
	{
		quote:
			"Понравилось, что это не просто шмотки. Чувствуется, что создатели думают про продукт, посадку, плотность ткани и итоговый вид бренда.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ekaterina",
		name: "Екатерина Белова",
		role: "Покупатель",
		company: "Санкт-Петербург",
	},
	{
		quote:
			"Крутой вайб, идеальный крой. Ничего лишнего, только суть. Худи просто неубиваемое.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Artem",
		name: "Артём Козлов",
		role: "Покупатель",
		company: "Казань",
	},
	{
		quote:
			"Заказывал куртку и штаны — посадка огонь. Сидит свободно, но не мешковато. Именно тот уличный силуэт, который искал.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan",
		name: "Иван Морозов",
		role: "Покупатель",
		company: "Новосибирск",
	},
	{
		quote:
			"Доставка быстрая, упаковка аккуратная. Футболка LG белая — плотный хлопок, ворот не расползается после стирки.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
		name: "Мария Тихонова",
		role: "Покупатель",
		company: "Екатеринбург",
	},
	{
		quote:
			"Брал поло А1 на др другу — зашло на ура. Ткань приятная, швы ровные, выглядит дороже цены.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pavel",
		name: "Павел Орлов",
		role: "Покупатель",
		company: "Краснодар",
	},
	{
		quote:
			"Липовой — это про настроение. Надеваешь и сразу чувствуешь себя увереннее. Уже третий заказ, и каждый раз попадают в ожидания.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alina",
		name: "Алина Романова",
		role: "Покупатель",
		company: "Нижний Новгород",
	},
	{
		quote:
			"Широкие штаны сели идеально. Ткань плотная, не просвечивает. Для улицы и зала — топ.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alexey",
		name: "Алексей Жуков",
		role: "Покупатель",
		company: "Ростов-на-Дону",
	},
	{
		quote:
			"Редко пишу отзывы, но тут реально зацепило. Минимализм, качество и свой вайб — именно то, чего не хватало на рынке.",
		image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sergey",
		name: "Сергей Волков",
		role: "Покупатель",
		company: "Самара",
	},
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export function TestimonialsSection({ reviewVideos = [] }) {
	return (
		<div className="testimonialsLayout">
			<div className="testimonialsHead">
				<span className="testimonialsNum">002 / Отзывы</span>
				<h2 className="testimonialsTitle">
					<span>ОТЗЫВЫ.</span>
					<span>НАШЕ КОМЬЮНИТИ</span>
				</h2>
				<p className="testimonialsSub">
					Что говорят те, кто уже носит Липовой.
				</p>
			</div>

			<div className="testimonialsBody">
				<div
					className={cn(
						"testimonialsSliders",
						"mask-[linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]"
					)}
				>
					<InfiniteSlider direction="vertical" speed={30} speedOnHover={15}>
						{firstColumn.map((testimonial) => (
							<TestimonialsCard key={testimonial.name} testimonial={testimonial} />
						))}
					</InfiniteSlider>
					<InfiniteSlider
						className="testimonialsCol--2"
						direction="vertical"
						speed={50}
						speedOnHover={25}
					>
						{secondColumn.map((testimonial) => (
							<TestimonialsCard key={testimonial.name} testimonial={testimonial} />
						))}
					</InfiniteSlider>
					<InfiniteSlider
						className="testimonialsCol--3"
						direction="vertical"
						speed={35}
						speedOnHover={17}
					>
						{thirdColumn.map((testimonial) => (
							<TestimonialsCard key={testimonial.name} testimonial={testimonial} />
						))}
					</InfiniteSlider>
				</div>

				<div className="testimonialsPhoneCol">
					<InstagramPhone videos={reviewVideos} username="lipovoygym.shop" />
				</div>
			</div>
		</div>
	);
}

function TestimonialsCard({ testimonial, className, ...props }) {
	const { quote, image, name, role, company } = testimonial;
	return (
		<figure
			className={cn("testimonialsCard", className)}
			{...props}
		>
			<blockquote>«{quote}»</blockquote>
			<figcaption>
				<Avatar className="size-8 rounded-full">
					<AvatarImage alt={name} src={image} />
					<AvatarFallback>{name.charAt(0)}</AvatarFallback>
				</Avatar>
				<div>
					<cite>{name}</cite>
					<span>{role}{company && `, ${company}`}</span>
				</div>
			</figcaption>
		</figure>
	);
}
